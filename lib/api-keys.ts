import { randomUUID } from "node:crypto";

export function generateApiKey() {
  const id = randomUUID();
  const key = `ev_${id}`;
  const prefix = key.slice(0, 12); // "ev_xxxxxxxx"
  return { key, prefix };
}
