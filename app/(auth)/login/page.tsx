import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth";

import styles from "./page.module.css";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className={`app-shell ${styles.page}`}>
      <section className={`panel ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <p className="eyebrow">Hosted admin dashboard</p>
          <h1 className="title">Monitor your projects from a single secure control room.</h1>
          <p className="subtitle">
            Pulseboard runs on the public internet with Supabase-backed admin login,
            while your event ingestion endpoint stays online for every project that
            sends it traffic.
          </p>
          <div className={styles.featureRail}>
            <span className="tag">Single admin sign-in</span>
            <span className="tag">Realtime event feed</span>
            <span className="tag">Hosted dashboard + API</span>
          </div>
        </div>
        <AuthForm />
      </section>
    </main>
  );
}
