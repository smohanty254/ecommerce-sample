import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { logger } from "./logger";

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/ws",
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Client connected");

    socket.on("join:user", (userId: number) => {
      socket.join(`user:${userId}`);
    });

    socket.on("join:admin", () => {
      socket.join("admin");
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Client disconnected");
    });
  });

  logger.info("Socket.io initialized");
  return io;
}

export function getIo(): SocketServer | null {
  return io;
}

export function emitToUser(userId: number, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToAdmin(event: string, data: unknown): void {
  if (!io) return;
  io.to("admin").emit(event, data);
}
