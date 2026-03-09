export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";

import { ProjectView } from "@/components/project/project-view";
import { createClient } from "@/lib/supabase/server";
import {
  getProjectActivity,
  getProjectById,
  getProjectChannels,
  getProjectEvents,
} from "@/lib/db/queries";

type Params = Promise<{ id: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [project, events, activity, channels] = await Promise.all([
    getProjectById(id, user.id),
    getProjectEvents(id, user.id, { limit: 100 }),
    getProjectActivity(id, user.id),
    getProjectChannels(id, user.id),
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
