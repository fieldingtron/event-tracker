import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { getProjectsForUser } from "@/lib/db/queries";

export async function GET() {
  try {
    const user = await requireApiUser();
    const projects = await getProjectsForUser(user.id);

    return NextResponse.json({ projects });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    throw error;
  }
}
