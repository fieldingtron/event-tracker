export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { ProjectView } from "@/components/project/project-view";
import {
  getProjectActivity,
  getProjectById,
  getProjectChannels,
  getProjectEvents,
} from "@/lib/db/queries";

type Params = Promise<{ id: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { id } = await params;

  const [project, events, activity, channels] = await Promise.all([
    getProjectById(id),
    getProjectEvents(id, { limit: 100 }),
    getProjectActivity(id),
    getProjectChannels(id),
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
