import { NextResponse } from "next/server";

import { insertEventByApiKey } from "@/lib/db/queries";
import { eventIngestSchema } from "@/lib/validation";

function getBearerToken(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

export async function POST(request: Request) {
  const apiKey = getBearerToken(request.headers.get("authorization"));

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header." },
      { status: 401 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = eventIngestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid event payload.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const result = await insertEventByApiKey(apiKey, parsed.data);

    return NextResponse.json(
      {
        ok: true,
        eventId: result.id,
        projectId: result.projectId,
        createdAt: result.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_API_KEY") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error(error);

    return NextResponse.json(
      { error: "Unable to record the event." },
      { status: 500 },
    );
  }
}
