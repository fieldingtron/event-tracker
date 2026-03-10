import { NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { getProjectChannels } from "@/lib/db/queries";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await getProjectChannels(id, session.user.id);
    return NextResponse.json({ channels }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to load channels.");
  }
}
