import { NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { createProject, getProjects } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { projectCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allProjects = await getProjects(user.id);
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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await createProject(parsed.data.name, user.id);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error(error);
    return buildApiErrorResponse(error, "Unable to create project.");
  }
}
