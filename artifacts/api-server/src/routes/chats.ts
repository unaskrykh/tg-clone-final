import { Router, type IRouter } from "express";
import { db, chatsTable, chatMembersTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";

const router: IRouter = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.userId!;
    const memberships = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, userId));
    if (memberships.length === 0) { res.json([]); return; }

    const chatIds = memberships.map(m => m.chatId);
    const chats = await db.select().from(chatsTable).where(inArray(chatsTable.id, chatIds));

    const result = await Promise.all(chats.map(async (chat) => {
      const members = await db.select().from(chatMembersTable).where(eq(chatMembersTable.chatId, chat.id));
      const memberCount = members.length;
      const [lastMessage] = await db.select().from(messagesTable)
        .where(and(eq(messagesTable.chatId, chat.id), eq(messagesTable.isDeleted, false)))
        .orderBy(desc(messagesTable.createdAt)).limit(1);

      let otherUser = null;
      if (chat.type === "dm") {
        const otherMember = members.find(m => m.userId !== userId);
        if (otherMember) {
          const [u] = await db.select().from(usersTable).where(eq(usersTable.id, otherMember.userId)).limit(1);
          if (u) {
            const { passwordHash: _, ...safe } = u;
            otherUser = safe;
          }
        }
      }

      let lastMsgWithSender = null;
      if (lastMessage) {
        const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, lastMessage.senderId)).limit(1);
        if (sender) {
          const { passwordHash: _, ...safeSender } = sender;
          lastMsgWithSender = { ...lastMessage, sender: safeSender };
        } else {
          lastMsgWithSender = lastMessage;
        }
      }

      return {
        ...chat,
        memberCount,
        lastMessage: lastMsgWithSender,
        otherUser,
        otherUserId: otherUser?.id || null,
        unreadCount: 0,
      };
    }));

    result.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Get chats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const userId = req.userId!;
    const { type, name, description, memberIds = [], targetUserId } = req.body;

    if (type === "dm") {
      if (!targetUserId) { res.status(400).json({ error: "targetUserId required for DM" }); return; }
      // Check if DM already exists
      const myChats = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, userId));
      for (const m of myChats) {
        const chatData = await db.select().from(chatsTable).where(and(eq(chatsTable.id, m.chatId), eq(chatsTable.type, "dm"))).limit(1);
        if (chatData.length > 0) {
          const otherMember = await db.select().from(chatMembersTable).where(and(eq(chatMembersTable.chatId, chatData[0].id), eq(chatMembersTable.userId, targetUserId))).limit(1);
          if (otherMember.length > 0) {
            // DM exists
            const members2 = await db.select().from(chatMembersTable).where(eq(chatMembersTable.chatId, chatData[0].id));
            const [lm] = await db.select().from(messagesTable).where(and(eq(messagesTable.chatId, chatData[0].id), eq(messagesTable.isDeleted, false))).orderBy(desc(messagesTable.createdAt)).limit(1);
            const [ou] = await db.select().from(usersTable).where(eq(usersTable.id, targetUserId)).limit(1);
            const { passwordHash: _, ...safeOu } = ou || {} as typeof ou;
            res.json({ ...chatData[0], memberCount: members2.length, lastMessage: lm || null, otherUser: ou ? safeOu : null, otherUserId: targetUserId, unreadCount: 0 });
            return;
          }
        }
      }
    }

    const [chat] = await db.insert(chatsTable).values({
      type,
      name: name || null,
      description: description || null,
      creatorId: userId,
    }).returning();

    // Add creator
    await db.insert(chatMembersTable).values({ chatId: chat.id, userId, role: "owner" });

    // Add other members
    const allMemberIds = type === "dm" ? [targetUserId] : memberIds;
    for (const mid of allMemberIds) {
      if (mid !== userId) {
        await db.insert(chatMembersTable).values({ chatId: chat.id, userId: mid, role: "member" });
      }
    }

    const members = await db.select().from(chatMembersTable).where(eq(chatMembersTable.chatId, chat.id));
    let otherUser = null;
    if (type === "dm" && targetUserId) {
      const [ou] = await db.select().from(usersTable).where(eq(usersTable.id, targetUserId)).limit(1);
      if (ou) { const { passwordHash: _, ...safe } = ou; otherUser = safe; }
    }

    res.json({ ...chat, memberCount: members.length, lastMessage: null, otherUser, otherUserId: targetUserId || null, unreadCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Create chat error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:chatId", authenticate, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const userId = req.userId!;
    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
    if (!chat) { res.status(404).json({ error: "Chat not found" }); return; }
    const members = await db.select().from(chatMembersTable).where(eq(chatMembersTable.chatId, chatId));
    const isMember = members.some(m => m.userId === userId);
    if (!isMember) { res.status(403).json({ error: "Not a member" }); return; }
    const [lm] = await db.select().from(messagesTable).where(and(eq(messagesTable.chatId, chatId), eq(messagesTable.isDeleted, false))).orderBy(desc(messagesTable.createdAt)).limit(1);
    let otherUser = null;
    if (chat.type === "dm") {
      const other = members.find(m => m.userId !== userId);
      if (other) {
        const [ou] = await db.select().from(usersTable).where(eq(usersTable.id, other.userId)).limit(1);
        if (ou) { const { passwordHash: _, ...safe } = ou; otherUser = safe; }
      }
    }
    res.json({ ...chat, memberCount: members.length, lastMessage: lm || null, otherUser, otherUserId: otherUser?.id || null, unreadCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Get chat error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:chatId/members", authenticate, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const members = await db.select().from(chatMembersTable).where(eq(chatMembersTable.chatId, chatId));
    const users = await Promise.all(members.map(async m => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
      if (!u) return null;
      const { passwordHash: _, ...safe } = u;
      return safe;
    }));
    res.json(users.filter(Boolean));
  } catch (err) {
    req.log.error({ err }, "Get members error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:chatId/members", authenticate, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const { userId: newUserId } = req.body;
    await db.insert(chatMembersTable).values({ chatId, userId: newUserId, role: "member" });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Add member error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
