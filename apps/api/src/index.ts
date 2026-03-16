import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./routers/index.js";
import { createContext } from "./routers/index.js";

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? {
            target: "pino-pretty",
            options: { colorize: true },
          }
        : undefined,
  },
});

async function start() {
  await server.register(cors, {
    origin: [
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  });

  await server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  });

  server.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    await server.listen({ port, host });
    console.log(`WheyWise API running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
