import { NextResponse } from "next/server";

import {
  createProject,
  getProjectByName,
  getSettings,
  insertEvent,
} from "@/lib/db/queries";
import { eventIngestSchema } from "@/lib/validation";

function getBearerToken(headerValue: string | null) {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
}

export async function POST(request: Request) {
  const apiKey = getBearerToken(request.headers.get("authorization"));

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header." },
      { status: 401 },
    );
  }

  const settingsRecord = await getSettings();
  if (!settingsRecord || settingsRecord.keyValue !== apiKey) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = eventIngestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid event payload.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    let project = await getProjectByName(parsed.data.project);
    if (!project) {
      project = await createProject(parsed.data.project);
    }

    const event = await insertEvent(project.id, {
      channel: parsed.data.channel,
      title: parsed.data.title,
      description: parsed.data.description,
      icon: parsed.data.icon,
      tags: parsed.data.tags,
    });

    return NextResponse.json(
      {
        ok: true,
        eventId: event.id,
        projectId: event.projectId,
        createdAt: event.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to record the event." }, { status: 500 });
  }
}
