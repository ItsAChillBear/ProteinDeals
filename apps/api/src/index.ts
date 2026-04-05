import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./routers/index.js";
import { createContext } from "./routers/index.js";
import { scrapeMyproteinWheyProducts } from "./scrapers/myprotein.js";
import { scrapeMyproteinVoucherCodes } from "./scrapers/vouchercodes.js";
import { testVoucherCodes } from "./scrapers/vouchercodes-tester.js";
import {
  getCompareProducts,
  previewMyproteinSync,
  importMyproteinRecords,
  applyMyproteinSync,
  clearMyproteinDatabase,
} from "./services/myprotein-import.js";
import { importWorkingVoucherCodes } from "./services/voucher-code-import.js";

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

function getMyproteinScrapeOptions(query: unknown) {
  const params = query as {
    categoryUrl?: string | string[];
    categoryLabel?: string | string[];
  };

  const rawCategoryUrls = Array.isArray(params?.categoryUrl)
    ? params.categoryUrl
    : typeof params?.categoryUrl === "string"
      ? [params.categoryUrl]
      : [];

  const categoryUrls = rawCategoryUrls.filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  const rawCategoryLabels = Array.isArray(params?.categoryLabel)
    ? params.categoryLabel
    : typeof params?.categoryLabel === "string"
      ? [params.categoryLabel]
      : [];
  const categoryLabels = rawCategoryLabels.filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  const categoryTargets =
    categoryUrls.length && categoryLabels.length === categoryUrls.length
      ? categoryUrls.map((url, index) => ({
          url,
          label: categoryLabels[index]!,
        }))
      : undefined;

  return {
    categoryTargets,
    categoryUrls: categoryUrls.length ? categoryUrls : undefined,
  };
}

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

  server.get("/", async () => ({
    name: "ProteinDeals API",
    status: "ok",
    health: "/health",
    trpc: "/trpc",
    timestamp: new Date().toISOString(),
  }));

  server.get("/favicon.ico", async (_request, reply) => {
    reply.code(204);
    return reply.send();
  });

  server.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  server.post("/internal/scrapers/myprotein/run", async (request, reply) => {
    const scrapeOptions = getMyproteinScrapeOptions(request.query);
    const startedAt = new Date().toISOString();

    try {
      const records = await scrapeMyproteinWheyProducts({
        ...scrapeOptions,
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
    const scrapeOptions = getMyproteinScrapeOptions(request.query);
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
        ...scrapeOptions,
        onProgress: async (message: string) => {
          send("progress", { message });
        },
        onVariant: async (record) => {
          send("variant", { record });
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

  server.post("/internal/scrapers/vouchercodes/run", async (request, reply) => {
    const startedAt = new Date().toISOString();

    try {
      const records = await scrapeMyproteinVoucherCodes();

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

  server.get("/internal/scrapers/vouchercodes/stream", async (request, reply) => {
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
      send("progress", { message: "Starting VoucherCodes scrape" });
      const records = await scrapeMyproteinVoucherCodes({
        onProgress: async (message: string) => {
          send("progress", { message });
        },
      });

      for (const record of records) {
        send("record", { record });
      }

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

  server.post("/internal/scrapers/vouchercodes/test-records", async (request, reply) => {
    const startedAt = new Date().toISOString();
    const body = request.body as { records?: unknown };

    try {
      const records = Array.isArray(body?.records) ? body.records : [];
      const testResults = await testVoucherCodes(records as Parameters<typeof testVoucherCodes>[0]);

      return {
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        count: testResults.length,
        testResults,
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown voucher test error",
      };
    }
  });

  server.post("/internal/scrapers/vouchercodes/import-records", async (request, reply) => {
    const startedAt = new Date().toISOString();
    const body = request.body as { records?: unknown; testResults?: unknown };

    try {
      const records = Array.isArray(body?.records) ? body.records : [];
      const testResults = Array.isArray(body?.testResults) ? body.testResults : [];
      const importResult = await importWorkingVoucherCodes({
        records: records as Parameters<typeof importWorkingVoucherCodes>[0]["records"],
        testResults: testResults as Parameters<typeof importWorkingVoucherCodes>[0]["testResults"],
      });

      return {
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        importResult,
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown voucher import error",
      };
    }
  });

  server.post("/internal/scrapers/myprotein/import", async (request, reply) => {
    const scrapeOptions = getMyproteinScrapeOptions(request.query);
    const startedAt = new Date().toISOString();

    try {
      const records = await scrapeMyproteinWheyProducts({
        ...scrapeOptions,
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

  server.post(
    "/internal/scrapers/myprotein/import-stream",
    { bodyLimit: 10 * 1024 * 1024 },
    async (request, reply) => {
      const startedAt = new Date().toISOString();
      const body = request.body as { records?: unknown; entryIds?: unknown };
      const query = request.query as { includeDeletes?: string; categoryUrl?: string | string[] };
      const includeDeletes = query.includeDeletes === "true";
      const scrapeOptions = getMyproteinScrapeOptions(request.query);

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders?.();

      const send = (event: string, payload: unknown) => {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      try {
        const records = Array.isArray(body?.records) ? body.records : [];
        send("progress", { message: "Building diff preview...", index: 0, total: 0 });

        const preview = await previewMyproteinSync(
          records as Awaited<ReturnType<typeof scrapeMyproteinWheyProducts>>,
          { includeDeletes, deleteCategoryUrls: scrapeOptions.categoryUrls }
        );
        const rawEntryIds = Array.isArray(body?.entryIds) ? body.entryIds : null;
        const entryIds =
          rawEntryIds?.filter((value): value is string => typeof value === "string") ??
          preview.entries.map((entry) => entry.id);

        const actionableCount = preview.entries.filter(
          (e) => entryIds.includes(e.id) && e.action !== "unchanged"
        ).length;
        send("progress", { message: `Applying ${actionableCount} changes...`, index: 0, total: actionableCount });

        const importResult = await applyMyproteinSync(entryIds, preview, async (message, index, total) => {
          send("progress", { message, index, total });
        });

        send("complete", {
          ok: true,
          startedAt,
          finishedAt: new Date().toISOString(),
          count: records.length,
          importResult,
        });
      } catch (error) {
        request.log.error(error);
        send("error", {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown import error",
        });
      } finally {
        reply.raw.end();
      }

      return reply;
    }
  );

  server.post(
    "/internal/scrapers/myprotein/import-records",
    { bodyLimit: 10 * 1024 * 1024 },
    async (request, reply) => {
      const startedAt = new Date().toISOString();
      const body = request.body as { records?: unknown; entryIds?: unknown };
      const query = request.query as { includeDeletes?: string; categoryUrl?: string | string[] };
      const includeDeletes = query.includeDeletes === "true";
      const scrapeOptions = getMyproteinScrapeOptions(request.query);

      try {
        const records = Array.isArray(body?.records) ? body.records : [];
        const preview = await previewMyproteinSync(
          records as Awaited<ReturnType<typeof scrapeMyproteinWheyProducts>>,
          { includeDeletes, deleteCategoryUrls: scrapeOptions.categoryUrls }
        );
        const rawEntryIds = Array.isArray(body?.entryIds) ? body.entryIds : null;
        const entryIds =
          rawEntryIds?.filter((value): value is string => typeof value === "string") ??
          preview.entries.map((entry) => entry.id);
        const importResult = await applyMyproteinSync(entryIds, preview);

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
    }
  );

  server.post("/internal/scrapers/myprotein/clear", async (request, reply) => {
    const startedAt = new Date().toISOString();
    const scrapeOptions = getMyproteinScrapeOptions(request.query);

    try {
      const clearResult = await clearMyproteinDatabase(scrapeOptions.categoryUrls);

      return {
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        clearResult,
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown clear error",
      };
    }
  });

  server.post(
    "/internal/scrapers/myprotein/preview-records",
    { bodyLimit: 10 * 1024 * 1024 },
    async (request, reply) => {
      const startedAt = new Date().toISOString();
      const body = request.body as { records?: unknown };
      const query = request.query as { includeDeletes?: string; categoryUrl?: string | string[] };
      const includeDeletes = query.includeDeletes === "true";
      const scrapeOptions = getMyproteinScrapeOptions(request.query);

      try {
        const records = Array.isArray(body?.records) ? body.records : [];
        const preview = await previewMyproteinSync(
          records as Awaited<ReturnType<typeof scrapeMyproteinWheyProducts>>,
          { includeDeletes, deleteCategoryUrls: scrapeOptions.categoryUrls }
        );

        return {
          ok: true,
          startedAt,
          finishedAt: new Date().toISOString(),
          count: records.length,
          preview,
        };
      } catch (error) {
        request.log.error(error);
        reply.code(500);
        return {
          ok: false,
          startedAt,
          finishedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown preview error",
        };
      }
    }
  );

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
    console.log(`ProteinDeals API running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
