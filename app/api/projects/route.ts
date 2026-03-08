import { NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { createProject, getProjects } from "@/lib/db/queries";
import { projectCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const allProjects = await getProjects();
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
    const project = await createProject(parsed.data.name);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to create project.");
  }
}
