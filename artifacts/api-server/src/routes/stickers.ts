import { Router, type IRouter } from "express";
import { db, stickerPacksTable, stickersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";

const router: IRouter = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const packs = await db.select().from(stickerPacksTable).where(eq(stickerPacksTable.userId, req.userId!));
    const result = await Promise.all(packs.map(async (pack) => {
      const stickers = await db.select().from(stickersTable).where(eq(stickersTable.packId, pack.id));
      return { ...pack, stickers };
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Get stickers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const { name, stickers = [] } = req.body;
    if (!name) { res.status(400).json({ error: "Name required" }); return; }
    const [pack] = await db.insert(stickerPacksTable).values({ userId: req.userId!, name }).returning();
    const insertedStickers = await Promise.all(stickers.map(async (s: { imageUrl: string; emoji?: string }) => {
      const [sticker] = await db.insert(stickersTable).values({ packId: pack.id, imageUrl: s.imageUrl, emoji: s.emoji || null }).returning();
      return sticker;
    }));
    res.json({ ...pack, stickers: insertedStickers });
  } catch (err) {
    req.log.error({ err }, "Create sticker pack error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
