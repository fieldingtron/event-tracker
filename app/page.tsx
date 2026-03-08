export const dynamic = "force-dynamic";

import { HomeView } from "@/components/home/home-view";
import { getProjects, getSettings } from "@/lib/db/queries";

export default async function HomePage() {
  const [projects, settingsRecord] = await Promise.all([getProjects(), getSettings()]);

  return (
    <HomeView
      projects={projects}
      keyPrefix={settingsRecord?.keyPrefix ?? null}
      keyExists={settingsRecord !== null}
    />
  );
}
