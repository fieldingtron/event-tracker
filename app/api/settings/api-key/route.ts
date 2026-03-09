import { NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { getOrCreateSettings, regenerateSettings } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await getOrCreateSettings(user.id);
    return NextResponse.json({ keyValue: record.keyValue, prefix: record.keyPrefix });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to load API key.");
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await regenerateSettings(user.id);
    return NextResponse.json({ keyValue: record.keyValue, prefix: record.keyPrefix });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to regenerate API key.");
  }
}
