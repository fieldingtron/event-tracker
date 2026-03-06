import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { getActivityForUser } from "@/lib/db/queries";
import { dashboardFiltersSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const parsed = dashboardFiltersSchema.safeParse({
      projectId: url.searchParams.get("projectId") ?? undefined,
      channel: url.searchParams.get("channel") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid filters." }, { status: 400 });
    }

    const activity = await getActivityForUser(user.id, parsed.data);

    return NextResponse.json({ activity });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    throw error;
  }
}
