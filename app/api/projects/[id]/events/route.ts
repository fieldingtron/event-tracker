import { NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { getProjectEvents } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { projectFiltersSchema } from "@/lib/validation";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const url = new URL(request.url);

  const parsed = projectFiltersSchema.safeParse({
    channel: url.searchParams.get("channel") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const filters = parsed.success ? parsed.data : { limit: 100 };

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectEvents = await getProjectEvents(id, user.id, filters);
    return NextResponse.json({ events: projectEvents }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to load events.");
  }
}
