import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { archiveProject } from "@/lib/db/queries";

type Params = Promise<{ projectId: string }>;

export async function PATCH(
  _request: Request,
  { params }: { params: Params },
) {
  try {
    const user = await requireApiUser();
    const { projectId } = await params;

    await archiveProject(user.id, projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    console.error(error);

    return NextResponse.json(
      { error: "Unable to archive project." },
      { status: 500 },
    );
  }
}
