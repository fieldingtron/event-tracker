import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";

// Load .env and .env.local files manually
const envFiles = [".env", ".env.local"];
for (const file of envFiles) {
  const envPath = resolve(__dirname, "..", file);
  if (existsSync(envPath)) {
    console.log(`Loading environment from ${file}...`);
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      
      // Remove surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const drizzleDir = resolve(__dirname, "../drizzle");

// Read journal
const journalPath = resolve(drizzleDir, "meta/_journal.json");
if (!existsSync(journalPath)) {
  console.error("Drizzle journal not found at", journalPath);
  process.exit(1);
}

const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as {
  entries: { tag: string; when: number }[];
};

// Compute hashes
const migrations = journal.entries.map((entry) => {
  const sql = readFileSync(resolve(drizzleDir, `${entry.tag}.sql`), "utf-8");
  const hash = createHash("sha256").update(sql).digest("hex");
  return { tag: entry.tag, hash, createdAt: entry.when };
});

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error("TURSO_DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  try {
    // Check if __drizzle_migrations table exists
    const tableExists = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'
    `);

    if (tableExists.rows.length === 0) {
      console.log("Creating __drizzle_migrations table...");
      await client.execute(`
        CREATE TABLE "__drizzle_migrations" (
          "id" integer PRIMARY KEY AUTOINCREMENT,
          "hash" text NOT NULL,
          "created_at" numeric
        )
      `);
    }

    // Show current state
    const existing = await client.execute(
      "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at"
    );
    console.log(`Found ${existing.rows.length} existing migration record(s):`);
    for (const row of existing.rows) {
      console.log(
        `  id=${row.id} hash=${String(row.hash).slice(0, 16)}... created_at=${row.created_at}`
      );
    }

    const existingHashes = new Set(existing.rows.map((r) => String(r.hash)));

    // Insert missing records
    let inserted = 0;
    for (const m of migrations) {
      if (existingHashes.has(m.hash)) {
        console.log(`  SKIP ${m.tag} — already tracked`);
        continue;
      }
      await client.execute({
        sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        args: [m.hash, m.createdAt],
      });
      console.log(`  INSERT ${m.tag} (hash=${m.hash.slice(0, 16)}... created_at=${m.createdAt})`);
      inserted++;
    }

    // Verify
    const after = await client.execute(
      "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at"
    );
    console.log(
      `\nDone. ${inserted} inserted. ${after.rows.length} total migration record(s) now tracked.`
    );
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
