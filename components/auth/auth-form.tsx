"use client";

import { LoaderCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { createBrowserClient } from "@/lib/supabase/browser";

import styles from "./auth-form.module.css";

export function AuthForm() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) {
        setError(response.error.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <section className={`panel panel-strong ${styles.card}`}>
      <div className="stack">
        <div>
          <p className="eyebrow">Admin access</p>
          <h2 className={styles.title}>Sign in to manage your event feed</h2>
          <p className="subtitle">
            Use the single admin account created in Supabase Auth for this deployment.
          </p>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
            />
          </div>
          <button className="button accent" type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className={styles.spin} size={18} /> : null}
            <LogIn size={16} />
            Sign in
          </button>
        </form>
        {error ? <p className="danger-text">{error}</p> : null}
      </div>
    </section>
  );
}
