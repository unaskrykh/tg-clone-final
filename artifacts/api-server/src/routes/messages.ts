import { Router, type IRouter } from "express";
import { db, messagesTable, chatMembersTable, usersTable } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";

const router: IRouter = Router();

router.get("/:chatId", authenticate, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const membership = await db.select().from(chatMembersTable).where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, userId))).limit(1);
    if (membership.length === 0) { res.status(403).json({ error: "Not a member" }); return; }

    const messages = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.chatId, chatId), eq(messagesTable.isDeleted, false)))
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const withSenders = await Promise.all(messages.map(async (msg) => {
      const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId)).limit(1);
      let replyTo = null;
      if (msg.replyToId) {
        const [rm] = await db.select().from(messagesTable).where(eq(messagesTable.id, msg.replyToId)).limit(1);
        if (rm) {
          const [rs] = await db.select().from(usersTable).where(eq(usersTable.id, rm.senderId)).limit(1);
          if (rs) { const { passwordHash: _, ...safe } = rs; replyTo = { ...rm, sender: safe }; }
          else replyTo = rm;
        }
      }
      if (sender) {
        const { passwordHash: _, ...safe } = sender;
        return { ...msg, sender: safe, replyTo };
      }
      return { ...msg, sender: null, replyTo };
    }));

    res.json(withSenders.reverse());
  } catch (err) {
    req.log.error({ err }, "Get messages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:chatId", authenticate, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const userId = req.userId!;
    const { type = "text", content, fileUrl, fileName, fileSize, duration, replyToId } = req.body;

    const membership = await db.select().from(chatMembersTable).where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, userId))).limit(1);
    if (membership.length === 0) { res.status(403).json({ error: "Not a member" }); return; }

    const [message] = await db.insert(messagesTable).values({
      chatId,
      senderId: userId,
      type,
      content: content || null,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      duration: duration || null,
      replyToId: replyToId || null,
      isDeleted: false,
    }).returning();

    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const { passwordHash: _, ...safeSender } = sender;

    const fullMessage = { ...message, sender: safeSender, replyTo: null };

    // Emit via socket - get io from app
    const io = (req as any).io;
    if (io) {
      io.to(`chat:${chatId}`).emit("new_message", fullMessage);
    }

    res.json(fullMessage);
  } catch (err) {
    req.log.error({ err }, "Send message error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:chatId/:messageId", authenticate, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const messageId = parseInt(req.params.messageId);
    const userId = req.userId!;

    const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId)).limit(1);
    if (!msg || msg.senderId !== userId) { res.status(403).json({ error: "Cannot delete this message" }); return; }

    await db.update(messagesTable).set({ isDeleted: true }).where(eq(messagesTable.id, messageId));

    const io = (req as any).io;
    if (io) {
      io.to(`chat:${chatId}`).emit("message_deleted", { messageId, chatId });
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete message error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
