import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router: IRouter = Router();
const ADMIN_PASSWORD = "zlrpb89444";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "tg-admin-secret-2024";

router.post("/login", (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid admin password" });
    return;
  }
  const token = jwt.sign({ admin: true }, ADMIN_SECRET, { expiresIn: "1d" });
  res.json({ token });
});

router.post("/stars", async (req, res) => {
  try {
    const { username, amount, adminToken } = req.body;
    if (!adminToken) { res.status(401).json({ error: "Admin token required" }); return; }
    try {
      jwt.verify(adminToken, ADMIN_SECRET);
    } catch {
      res.status(401).json({ error: "Invalid admin token" }); return;
    }
    if (!username || amount === undefined) {
      res.status(400).json({ error: "Username and amount required" }); return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase())).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const newStars = Math.max(0, user.stars + amount);
    const [updated] = await db.update(usersTable).set({ stars: newStars }).where(eq(usersTable.id, user.id)).returning();
    const { passwordHash: _, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
