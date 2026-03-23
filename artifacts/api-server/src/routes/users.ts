import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, and, ne } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";

const router: IRouter = Router();

router.get("/me", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/me/settings", authenticate, async (req, res) => {
  try {
    const { displayName, bio, theme, fontSize, emojiStatus } = req.body;
    const updates: Record<string, unknown> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (theme !== undefined) updates.theme = theme;
    if (fontSize !== undefined) updates.fontSize = fontSize;
    if (emojiStatus !== undefined) updates.emojiStatus = emojiStatus;

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!)).returning();
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    req.log.error({ err }, "Update settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/search", authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    if (!q) { res.json([]); return; }
    const users = await db.select().from(usersTable).where(
      and(ilike(usersTable.username, `%${q.toLowerCase()}%`), ne(usersTable.id, req.userId!))
    ).limit(20);
    const safe = users.map(({ passwordHash: _, ...u }) => u);
    res.json(safe);
  } catch (err) {
    req.log.error({ err }, "Search users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:userId", authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    req.log.error({ err }, "Get user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
