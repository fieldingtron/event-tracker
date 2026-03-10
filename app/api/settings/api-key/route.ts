import { NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { getOrCreateSettings, regenerateSettings } from "@/lib/db/queries";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  console.log("Hitting API key GET handler");
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await getOrCreateSettings(session.user.id);
    return NextResponse.json({ keyValue: record.keyValue, prefix: record.keyPrefix });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to load API key.");
  }
}

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await regenerateSettings(session.user.id);
    return NextResponse.json({ keyValue: record.keyValue, prefix: record.keyPrefix });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to regenerate API key.");
  }
}
