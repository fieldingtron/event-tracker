export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";

import { ProjectView } from "@/components/project/project-view";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getProjectActivity,
  getProjectById,
  getProjectChannels,
  getProjectEvents,
} from "@/lib/db/queries";

type Params = Promise<{ id: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const [project, events, activity, channels] = await Promise.all([
    getProjectById(id, session.user.id),
    getProjectEvents(id, session.user.id, { limit: 100 }),
    getProjectActivity(id, session.user.id),
    getProjectChannels(id, session.user.id),
  ]);

  if (!project) notFound();

  return (
    <ProjectView
      projectId={project.id}
      projectName={project.name}
      initialEvents={events}
      initialActivity={activity}
      initialChannels={channels}
    />
  );
}
