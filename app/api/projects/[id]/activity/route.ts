import { NextResponse } from "next/server";

import { getProjectActivity } from "@/lib/db/queries";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params;

  try {
    const activity = await getProjectActivity(id);
    return NextResponse.json({ activity }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load activity." }, { status: 500 });
  }
}
