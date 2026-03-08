import { NextResponse } from "next/server";

import { getOrCreateSettings, regenerateSettings } from "@/lib/db/queries";

export async function GET() {
  try {
    const record = await getOrCreateSettings();
    return NextResponse.json({ keyValue: record.keyValue, prefix: record.keyPrefix });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load API key." }, { status: 500 });
  }
}

export async function POST() {
  try {
    const record = await regenerateSettings();
    return NextResponse.json({ keyValue: record.keyValue, prefix: record.keyPrefix });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to regenerate API key." }, { status: 500 });
  }
}
