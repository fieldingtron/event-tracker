"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Project } from "@/lib/types";
import styles from "./home-view.module.css";

const SampleDataLoader = dynamic(
  () => import("./sample-data-loader").then((mod) => mod.SampleDataLoader),
  {
    ssr: false,
    loading: () => <div className={styles.sampleSkeleton} aria-hidden="true" />,
  },
);

const PROJECT_COLORS = [
  "#4A90D9",
  "#7B6CF6",
  "#E8845C",
  "#4AAD7B",
  "#D4649A",
  "#5BAFC7",
];

function getProjectColor(name: string) {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

function getInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

type HomeViewProps = {
  projects: Project[];
  keyPrefix: string | null;
  keyExists: boolean;
};

export function HomeView({ projects: initialProjects, keyPrefix: initialKeyPrefix, keyExists }: HomeViewProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [keyPrefix, setKeyPrefix] = useState<string | null>(initialKeyPrefix);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const applyTheme = useCallback((nextTheme: "light" | "dark") => {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === "dark" || current === "light") {
      setTheme(current);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (!keyExists) {
      fetch("/api/settings/api-key")
        .then((r) => r.json())
        .then((data) => {
          setRevealedKey(data.keyValue);
          setKeyPrefix(data.prefix);
        })
        .catch(console.error);
    }
  }, [keyExists]);

  const handleReveal = async () => {
    if (revealedKey) {
      await navigator.clipboard.writeText(revealedKey).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setIsRevealing(true);
    try {
      const r = await fetch("/api/settings/api-key");
      const data = await r.json();
      setRevealedKey(data.keyValue);
      setKeyPrefix(data.prefix);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setIsSaving(true);
    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (r.ok) {
        const data = await r.json();
        setProjects((prev) => [data.project, ...prev]);
        setNewProjectName("");
        setIsCreating(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenProject = useCallback(
    (projectId: string) => {
      router.push(`/project/${projectId}`);
    },
    [router],
  );

  const maskedKey = useMemo(
    () => (keyPrefix ? `${keyPrefix}${"•".repeat(30)}` : `ev_${"•".repeat(36)}`),
    [keyPrefix],
  );

  return (
    <main className={`app-shell ${styles.page}`}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Events Dashboard</h1>
            <p className={styles.subtitle}>Your projects, your events, all in one place.</p>
          </div>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      {/* API KEY CARD */}
      <div className={styles.apiKeyCard}>
        <div className={styles.apiKeyLabel}>
          <KeyIcon />
          API KEY
        </div>
        <div className={styles.apiKeyRow}>
          <code className={styles.apiKeyValue}>
            {revealedKey ?? maskedKey}
          </code>
          <button
            className={styles.revealBtn}
            onClick={handleReveal}
            disabled={isRevealing}
          >
            {revealedKey ? (copied ? "✓ Copied" : "Copy") : isRevealing ? "..." : "Reveal"}
          </button>
        </div>
      </div>

      {/* PROJECTS */}
      {projects.length === 0 && !isCreating ? (
        <div className={styles.emptyState}>
          <FileIcon className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>No projects yet!</h2>
          <p className={styles.emptySubtitle}>
            Create your first project to start tracking events.
          </p>
          <button className="button accent" onClick={() => setIsCreating(true)}>
            Create your first project
          </button>
        </div>
      ) : (
        <div className={styles.projectGrid}>
          {projects.map((p) => (
            <button
              key={p.id}
              className={styles.projectCard}
              onClick={() => handleOpenProject(p.id)}
            >
              <div className={styles.projectCardContent}>
                <div
                  className={styles.projectAvatar}
                  style={{ background: getProjectColor(p.name) }}
                >
                  <span className={styles.projectInitials}>{getInitials(p.name)}</span>
                </div>
                <div className={styles.projectMeta}>
                  <span className={styles.projectName}>{p.name}</span>
                  <span className={styles.projectCount}>
                    {p.eventCount.toLocaleString()} event{p.eventCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <ArrowIcon />
            </button>
          ))}
          <button className={styles.newProjectCard} onClick={() => setIsCreating(true)}>
            <span className={styles.plusCircle}>+</span>
            <span className={styles.newProjectLabel}>New project</span>
          </button>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {isCreating && (
        <div className={styles.createOverlay} onClick={(e) => { if (e.target === e.currentTarget) setIsCreating(false); }}>
          <div className={styles.createModal}>
            <h3>New project</h3>
            <input
              className="input"
              placeholder="my-app"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
                if (e.key === "Escape") setIsCreating(false);
              }}
              autoFocus
            />
            <div className={styles.createActions}>
              <button className="button secondary" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button
                className="button accent"
                onClick={handleCreateProject}
                disabled={isSaving || !newProjectName.trim()}
              >
                {isSaving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAMPLE DATA */}
      <SampleDataLoader apiKey={revealedKey} onLoad={() => router.refresh()} />
    </main>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
