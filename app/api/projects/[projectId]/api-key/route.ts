import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { regenerateProjectApiKey } from "@/lib/db/queries";

type Params = Promise<{ projectId: string }>;

export async function POST(
  _request: Request,
  { params }: { params: Params },
) {
  try {
    const user = await requireApiUser();
    const { projectId } = await params;

    const result = await regenerateProjectApiKey(user.id, projectId);

    return NextResponse.json({
      apiKey: result.apiKey,
      prefix: result.prefix,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    console.error(error);

    return NextResponse.json(
      { error: "Unable to regenerate API key." },
      { status: 500 },
    );
  }
}
