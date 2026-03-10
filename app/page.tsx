export const dynamic = "force-dynamic";

import { HomeView } from "@/components/home/home-view";
import { getProjects, getSettings } from "@/lib/db/queries";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const [projects, settingsRecord] = await Promise.all([
    getProjects(session.user.id),
    getSettings(session.user.id)
  ]);

  return (
    <HomeView
      projects={projects}
      keyPrefix={settingsRecord?.keyPrefix ?? null}
      keyExists={settingsRecord !== null}
    />
  );
}
