import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required. Copy .env.example to .env and set your database URL."
  );
}

const connectionString = process.env.DATABASE_URL;

// For Drizzle migrations and queries
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // suppress notice messages
});

export const db = drizzle(queryClient, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

export type Database = typeof db;
