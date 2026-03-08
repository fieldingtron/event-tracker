import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Lazily initialized — avoids throwing at build time when DATABASE_URL is absent
let _db: ReturnType<typeof drizzle> | undefined;

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL environment variable is not set.");
    _db = drizzle(postgres(url, { prepare: false }));
  }
  return _db;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<string | symbol, unknown>;
    const value = instance[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(getDb()) : value;
  },
});
