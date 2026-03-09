import { NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { getProjectChannels } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await getProjectChannels(id, user.id);
    return NextResponse.json({ channels }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to load channels.");
  }
}
