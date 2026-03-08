import { NextResponse } from "next/server";

import { getProjectChannels } from "@/lib/db/queries";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params;

  try {
    const channels = await getProjectChannels(id);
    return NextResponse.json({ channels }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load channels." }, { status: 500 });
  }
}
