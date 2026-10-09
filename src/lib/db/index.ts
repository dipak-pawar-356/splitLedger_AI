import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema/schema";
import { ensureDatabaseSchema } from "./auto-migrate";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/splitledger";
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 350): Promise<T> {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      // 20-second timeout guard to prevent server action worker deadlocks & accommodate Neon serverless cold starts
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database operation timed out after 20s")), 20000)
      );

      return await Promise.race([fn(), timeoutPromise]);
    } catch (err: any) {
      lastError = err;

      // If missing column, table error, or enum type mismatch (42703 / 42P01 / 22P02), run schema sync and retry
      if (
        err?.code === "42703" ||
        err?.code === "42P01" ||
        err?.code === "22P02" ||
        err?.message?.includes("does not exist") ||
        err?.message?.includes("invalid input value for enum")
      ) {
        try {
          await ensureDatabaseSchema();
        } catch (_) {}
      }

      const isNetworkOrColdStart =
        err?.message?.includes("fetch failed") ||
        err?.message?.includes("connection") ||
        err?.message?.includes("timeout") ||
        err?.code === "ECONNRESET" ||
        err?.code === "ETIMEDOUT" ||
        err?.code === "42703" ||
        err?.code === "42P01" ||
        err?.code === "22P02";

      if (isNetworkOrColdStart && i < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
