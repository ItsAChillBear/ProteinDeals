import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./routers/index.js";
import { createContext } from "./routers/index.js";
import { scrapeMyproteinWheyProducts } from "./scrapers/myprotein.js";
import {
  getCompareProducts,
  importMyproteinRecords,
} from "./services/myprotein-import.js";

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

  server.post("/internal/scrapers/myprotein/run", async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? Number(query.limit) : undefined;
    const startedAt = new Date().toISOString();

    try {
      const records = await scrapeMyproteinWheyProducts({
        limitProducts:
          typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
      });

      return {
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        count: records.length,
        records,
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown scraper error",
      };
    }
  });

  server.get("/internal/scrapers/myprotein/stream", async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? Number(query.limit) : undefined;
    const startedAt = new Date().toISOString();

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders?.();

    const send = (event: string, payload: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      send("progress", { message: "Starting Myprotein scrape" });
      const records = await scrapeMyproteinWheyProducts({
        limitProducts:
          typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
        onProgress: async (message: string) => {
          send("progress", { message });
        },
      });

      send("complete", {
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        count: records.length,
        records,
      });
    } catch (error) {
      request.log.error(error);
      send("error", {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown scraper error",
      });
    } finally {
      reply.raw.end();
    }

    return reply;
  });

  server.post("/internal/scrapers/myprotein/import", async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? Number(query.limit) : undefined;
    const startedAt = new Date().toISOString();

    try {
      const records = await scrapeMyproteinWheyProducts({
        limitProducts:
          typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
      });
      const importResult = await importMyproteinRecords(records);

      return {
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        count: records.length,
        importResult,
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown import error",
      };
    }
  });

  server.post("/internal/scrapers/myprotein/import-records", async (request, reply) => {
    const startedAt = new Date().toISOString();
    const body = request.body as { records?: unknown };

    try {
      const records = Array.isArray(body?.records) ? body.records : [];
      const importResult = await importMyproteinRecords(records as Awaited<
        ReturnType<typeof scrapeMyproteinWheyProducts>
      >);

      return {
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        count: records.length,
        importResult,
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown import error",
      };
    }
  });

  server.get("/compare/products", async (request, reply) => {
    try {
      const items = await getCompareProducts();
      return {
        ok: true,
        items,
        total: items.length,
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load compare products",
      };
    }
  });

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
