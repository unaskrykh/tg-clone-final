import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";

const router: IRouter = Router();
const PREMIUM_COST = 50;

router.get("/balance", authenticate, async (req, res) => {
  try {
    const [user] = await db.select({ stars: usersTable.stars }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    res.json({ stars: user?.stars || 0 });
  } catch (err) {
    req.log.error({ err }, "Get stars error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/purchase-premium", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.stars < PREMIUM_COST) {
      res.status(400).json({ error: `Not enough stars. Premium costs ${PREMIUM_COST} stars.` });
      return;
    }
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const [updated] = await db.update(usersTable).set({
      stars: user.stars - PREMIUM_COST,
      isPremium: true,
      premiumExpiresAt: expiresAt,
    }).where(eq(usersTable.id, req.userId!)).returning();
    const { passwordHash: _, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    req.log.error({ err }, "Purchase premium error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
