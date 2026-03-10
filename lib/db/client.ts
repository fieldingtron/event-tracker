import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

let _db: ReturnType<typeof drizzle> | undefined;

function getDb() {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error("TURSO_DATABASE_URL environment variable is not set.");
    const client = createClient({ url, authToken });
    _db = drizzle(client);
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
