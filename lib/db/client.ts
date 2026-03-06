import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";

const connection = postgres(serverEnv.DATABASE_URL, {
  prepare: false,
});

export const db = drizzle(connection);
