import { createHash, randomBytes } from "node:crypto";

export function generateApiKey() {
  const key = `pb_${randomBytes(24).toString("base64url")}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 12);

  return { key, hash, prefix };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
