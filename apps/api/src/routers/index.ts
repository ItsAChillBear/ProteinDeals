import { initTRPC } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { productsRouter } from "./products.js";
import { pricesRouter } from "./prices.js";
import { retailersRouter } from "./retailers.js";

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return { req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  products: productsRouter,
  prices: pricesRouter,
  retailers: retailersRouter,
});

export type AppRouter = typeof appRouter;
