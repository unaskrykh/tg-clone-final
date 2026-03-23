import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import chatsRouter from "./chats.js";
import messagesRouter from "./messages.js";
import filesRouter from "./files.js";
import starsRouter from "./stars.js";
import stickersRouter from "./stickers.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/chats", chatsRouter);
router.use("/messages", messagesRouter);
router.use("/files", filesRouter);
router.use("/stars", starsRouter);
router.use("/stickers", stickersRouter);
router.use("/admin", adminRouter);

export default router;
