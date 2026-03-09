export const dynamic = "force-dynamic";

import { HomeView } from "@/components/home/home-view";
import { getProjects, getSettings } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projects, settingsRecord] = await Promise.all([
    getProjects(user.id),
    getSettings(user.id)
  ]);

  return (
    <HomeView
      projects={projects}
      keyPrefix={settingsRecord?.keyPrefix ?? null}
      keyExists={settingsRecord !== null}
    />
  );
}
