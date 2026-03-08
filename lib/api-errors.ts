import { NextResponse } from "next/server";

const DATABASE_CONNECTIVITY_PATTERNS = [
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "connection",
  "connect",
  "timeout",
  "could not connect",
  "is the server running",
  "terminating connection",
  "the database system is starting up",
  "failed to fetch",
];

function getErrorMessage(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    return typeof maybeMessage === "string" ? maybeMessage : "";
  }

  return "";
}

function isMissingDatabaseUrl(message: string): boolean {
  return message.includes("DATABASE_URL environment variable is not set");
}

function isDatabaseConnectivityError(message: string): boolean {
  const lower = message.toLowerCase();
  return DATABASE_CONNECTIVITY_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
}

export function buildApiErrorResponse(error: unknown, fallbackMessage: string) {
  const message = getErrorMessage(error);

  if (isMissingDatabaseUrl(message)) {
    return NextResponse.json(
      {
        error: "Database is not configured. Set DATABASE_URL and restart the server.",
      },
      { status: 500 },
    );
  }

  if (isDatabaseConnectivityError(message)) {
    return NextResponse.json(
      {
        error:
          "Database is currently unavailable. Make sure your database is running, then try again.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
