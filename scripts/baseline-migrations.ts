import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

// Load .env file manually (no dotenv dependency)
const envPath = resolve(__dirname, "../.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env file not found — rely on existing environment
}

const drizzleDir = resolve(__dirname, "../drizzle");

// Read journal — same source Drizzle uses
const journal = JSON.parse(
  readFileSync(resolve(drizzleDir, "meta/_journal.json"), "utf-8")
) as { entries: { tag: string; when: number }[] };

// Compute hashes the same way Drizzle does (SHA-256 of full SQL content)
const migrations = journal.entries.map((entry) => {
  const sql = readFileSync(resolve(drizzleDir, `${entry.tag}.sql`), "utf-8");
  const hash = createHash("sha256").update(sql).digest("hex");
  return { tag: entry.tag, hash, createdAt: entry.when };
});

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false });

  try {
    // Show current state
    const existing = await sql`
      SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at
    `;
    console.log(`Found ${existing.length} existing migration record(s):`);
    for (const row of existing) {
      console.log(`  id=${row.id} hash=${row.hash.slice(0, 16)}... created_at=${row.created_at}`);
    }

    const existingHashes = new Set(existing.map((r) => r.hash));

    // Insert missing records
    let inserted = 0;
    for (const m of migrations) {
      if (existingHashes.has(m.hash)) {
        console.log(`  SKIP ${m.tag} — already tracked`);
        continue;
      }
      await sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${m.hash}, ${m.createdAt})
      `;
      console.log(`  INSERT ${m.tag} (hash=${m.hash.slice(0, 16)}... created_at=${m.createdAt})`);
      inserted++;
    }

    // Verify
    const after = await sql`
      SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at
    `;
    console.log(`\nDone. ${inserted} inserted. ${after.length} total migration record(s) now tracked.`);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
