import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { createProjectWithApiKey } from "@/lib/db/queries";
import { projectCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const json = await request.json().catch(() => null);
    const parsed = projectCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid project payload.",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await createProjectWithApiKey(user.id, parsed.data.name);

    return NextResponse.json({
      project: result.project,
      apiKey: result.apiKey,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error(error);

    return NextResponse.json(
      { error: "Unable to create project." },
      { status: 500 },
    );
  }
}
