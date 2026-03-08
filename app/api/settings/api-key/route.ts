import { NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { getOrCreateSettings, regenerateSettings } from "@/lib/db/queries";

export async function GET() {
  try {
    const record = await getOrCreateSettings();
    return NextResponse.json({ keyValue: record.keyValue, prefix: record.keyPrefix });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to load API key.");
  }
}

export async function POST() {
  try {
    const record = await regenerateSettings();
    return NextResponse.json({ keyValue: record.keyValue, prefix: record.keyPrefix });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to regenerate API key.");
  }
}
