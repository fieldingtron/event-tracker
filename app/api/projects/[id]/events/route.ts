import { NextResponse } from "next/server";

import { getProjectEvents } from "@/lib/db/queries";
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
    const projectEvents = await getProjectEvents(id, filters);
    return NextResponse.json({ events: projectEvents }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load events." }, { status: 500 });
  }
}
