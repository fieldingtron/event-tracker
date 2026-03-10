import { NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { createProject, getProjects } from "@/lib/db/queries";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { projectCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allProjects = await getProjects(session.user.id);
    return NextResponse.json({ projects: allProjects });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to load projects.");
  }
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await createProject(parsed.data.name, session.user.id);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to create project.");
  }
}
