export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;

  // Vercel deployment (Production or Preview)
  if (process.env.VERCEL === "1") {
    return appUrl || (vercelUrl ? `https://${vercelUrl}` : "");
  }

  // Local development fallback
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function getDatabaseUrl(): string {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL environment variable is not set.");
  return url;
}
