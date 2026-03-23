import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "tg-clone-secret-key-2024";

const app: Express = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/api/socket.io",
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) { next(new Error("Unauthorized")); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    (socket as any).userId = payload.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = (socket as any).userId;
  logger.info({ userId }, "Socket connected");

  socket.on("join_chat", (chatId: number) => {
    socket.join(`chat:${chatId}`);
  });

  socket.on("leave_chat", (chatId: number) => {
    socket.leave(`chat:${chatId}`);
  });

  socket.on("typing", ({ chatId, isTyping }: { chatId: number; isTyping: boolean }) => {
    socket.to(`chat:${chatId}`).emit("user_typing", { userId, isTyping });
  });

  socket.on("disconnect", () => {
    logger.info({ userId }, "Socket disconnected");
  });
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Attach io to all requests for use in route handlers
app.use((req: any, _res, next) => {
  req.io = io;
  next();
});

app.use("/api", router);

export { httpServer as default, app, io };
