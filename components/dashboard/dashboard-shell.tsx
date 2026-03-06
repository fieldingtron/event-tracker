"use client";

import {
  Activity,
  Archive,
  FolderPlus,
  KeyRound,
  LoaderCircle,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

import {
  ActivityBucket,
  DashboardEvent,
  DashboardProject,
  DashboardQueryState,
} from "@/lib/types";
import { createBrowserClient } from "@/lib/supabase/browser";

import { ActivityChart } from "./activity-chart";
import styles from "./dashboard-shell.module.css";

type ProjectSecret = {
  apiKey: string;
  projectName: string;
};

type RealtimeEventRow = {
  id: string;
  project_id: string;
  channel: string;
  title: string;
  description: string | null;
  icon: string | null;
  tags: string[] | null;
  created_at: string;
};

type DashboardShellProps = {
  userEmail: string;
};

const EMPTY_FILTERS: DashboardQueryState = {
  projectId: "all",
  channel: "all",
  search: "",
};

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildQuery(filters: DashboardQueryState) {
  const params = new URLSearchParams();

  if (filters.projectId !== "all") {
    params.set("projectId", filters.projectId);
  }

  if (filters.channel !== "all") {
    params.set("channel", filters.channel);
  }

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  return params.toString();
}

function eventMatchesFilters(
  event: DashboardEvent,
  filters: DashboardQueryState,
) {
  if (filters.projectId !== "all" && event.projectId !== filters.projectId) {
    return false;
  }

  if (filters.channel !== "all" && event.channel !== filters.channel) {
    return false;
  }

  if (!filters.search.trim()) {
    return true;
  }

  const haystack = `${event.title} ${event.description ?? ""} ${event.tags.join(" ")}`.toLowerCase();
  return haystack.includes(filters.search.trim().toLowerCase());
}

function formatRelativeTime(timestamp: string) {
  const diffInMs = new Date(timestamp).getTime() - Date.now();
  const diffInMinutes = Math.round(diffInMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffInMinutes) < 60) {
    return formatter.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (Math.abs(diffInHours) < 24) {
    return formatter.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);
  return formatter.format(diffInDays, "day");
}

function normalizeRealtimeEvent(row: RealtimeEventRow): DashboardEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    channel: row.channel,
    title: row.title,
    description: row.description,
    icon: row.icon,
    tags: row.tags ?? [],
    createdAt: row.created_at,
  };
}

export function DashboardShell({ userEmail }: DashboardShellProps) {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserClient());
  const [filters, setFilters] = useState<DashboardQueryState>(EMPTY_FILTERS);
  const deferredSearch = useDeferredValue(filters.search);
  const activeFilters = {
    projectId: filters.projectId,
    channel: filters.channel,
    search: deferredSearch,
  };
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [activity, setActivity] = useState<ActivityBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectSecret, setProjectSecret] = useState<ProjectSecret | null>(null);

  const activeProjectCount = projects.filter((project) => !project.archivedAt).length;
  const totalEventCount = events.length;
  const channels = Array.from(new Set(events.map((event) => event.channel))).sort();
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));
  const appUrl = trimTrailingSlash(
    typeof window === "undefined" ? "" : window.location.origin,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setIsLoading(true);
      setError(null);

      try {
        const query = buildQuery({
          projectId: filters.projectId,
          channel: filters.channel,
          search: deferredSearch,
        });
        const suffix = query ? `?${query}` : "";
        const [projectsResponse, eventsResponse, activityResponse] = await Promise.all([
          fetch("/api/dashboard/projects", { cache: "no-store" }),
          fetch(`/api/dashboard/events${suffix}`, { cache: "no-store" }),
          fetch(`/api/dashboard/activity${suffix}`, { cache: "no-store" }),
        ]);

        if (!projectsResponse.ok || !eventsResponse.ok || !activityResponse.ok) {
          throw new Error("Failed to load dashboard data.");
        }

        const [projectsJson, eventsJson, activityJson] = await Promise.all([
          projectsResponse.json(),
          eventsResponse.json(),
          activityResponse.json(),
        ]);

        if (cancelled) {
          return;
        }

        setProjects(projectsJson.projects);
        setEvents(eventsJson.events);
        setActivity(activityJson.activity);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown dashboard error.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, filters.channel, filters.projectId]);

  const handleRealtimeInsert = useEffectEvent(
    (payload: RealtimePostgresInsertPayload<RealtimeEventRow>) => {
      const nextEvent = normalizeRealtimeEvent(payload.new);

      if (!nextEvent || !eventMatchesFilters(nextEvent, activeFilters)) {
        return;
      }

      startTransition(() => {
        setEvents((current) => [nextEvent, ...current].slice(0, 100));

        const bucketLabel = nextEvent.createdAt.slice(0, 13);

        setActivity((current) => {
          const existingBucket = current.find((bucket) => bucket.bucket === bucketLabel);

          if (existingBucket) {
            return current.map((bucket) =>
              bucket.bucket === bucketLabel
                ? { ...bucket, count: bucket.count + 1 }
                : bucket,
            );
          }

          const next = [...current, { bucket: bucketLabel, count: 1 }];
          next.sort((left, right) => left.bucket.localeCompare(right.bucket));
          return next;
        });
      });
    },
  );

  useEffect(() => {
    const channel = supabase
      .channel("events-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
        },
        handleRealtimeInsert,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function handleCreateProject() {
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }

    setIsMutating(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim() }),
      });

      if (!response.ok) {
        throw new Error("Project creation failed.");
      }

      const json = await response.json();

      setProjects((current) => [json.project, ...current]);
      setProjectSecret({
        apiKey: json.apiKey,
        projectName: json.project.name,
      });
      setProjectName("");
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unknown project error.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleArchiveProject(projectId: string) {
    setIsMutating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Unable to archive project.");
      }

      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                archivedAt: new Date().toISOString(),
                keyPrefix: null,
              }
            : project,
        ),
      );
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unknown archive error.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRegenerateKey(projectId: string, projectNameValue: string) {
    setIsMutating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/api-key`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to regenerate API key.");
      }

      const json = await response.json();
      setProjectSecret({
        apiKey: json.apiKey,
        projectName: projectNameValue,
      });
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? { ...project, keyPrefix: json.prefix }
            : project,
        ),
      );
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unknown API key error.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className={`app-shell ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className="eyebrow">Pulseboard</p>
          <h1 className="title">A live event surface for the projects you care about.</h1>
          <p className="subtitle">
            Track signups, orders, deploys, or internal signals from any app with
            a simple `POST /api/events` call.
          </p>
          <div className="cluster">
            <span className="tag">
              <ShieldCheck size={14} />
              API-key protected
            </span>
            <span className="tag">
              <Activity size={14} />
              Realtime feed + chart
            </span>
            <span className="tag">
              <Sparkles size={14} />
              Local dashboard, cloud-backed data
            </span>
          </div>
        </div>
        <div className={`panel ${styles.heroCard}`}>
          <div className={styles.metricRow}>
            <div>
              <p className={styles.metricLabel}>Signed in as</p>
              <p className={styles.metricValue}>{userEmail}</p>
            </div>
            <button className="button secondary" type="button" onClick={handleSignOut}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
          <div className={styles.metrics}>
            <article>
              <p className={styles.metricLabel}>Active projects</p>
              <strong className={styles.metricCount}>{activeProjectCount}</strong>
            </article>
            <article>
              <p className={styles.metricLabel}>Events in view</p>
              <strong className={styles.metricCount}>{totalEventCount}</strong>
            </article>
          </div>
          <div className={styles.endpointBox}>
            <p className={styles.metricLabel}>Ingestion endpoint</p>
            <code className="mono">
              {appUrl ? `${appUrl}/api/events` : "/api/events"}
            </code>
          </div>
        </div>
      </section>

      {projectSecret ? (
        <section className={`panel ${styles.secretPanel}`}>
          <div>
            <p className="eyebrow">API key issued</p>
            <h2 className={styles.sectionTitle}>{projectSecret.projectName}</h2>
            <p className="subtitle">
              This key is only shown once. Store it in your app secrets and use it
              as a Bearer token for `POST /api/events`.
            </p>
          </div>
          <div className={styles.secretValue}>
            <code className="mono">{projectSecret.apiKey}</code>
          </div>
        </section>
      ) : null}

      {error ? <p className="danger-text">{error}</p> : null}

      <section className={styles.contentGrid}>
        <aside className={`panel ${styles.sidebar}`}>
          <div className="stack">
            <div>
              <p className="eyebrow">Projects</p>
              <h2 className={styles.sectionTitle}>Manage API sources</h2>
            </div>

            <div className="stack">
              <div>
                <label className="label" htmlFor="project-name">
                  New project name
                </label>
                <input
                  className="input"
                  id="project-name"
                  placeholder="orders-service"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                />
              </div>
              <button
                className="button accent"
                type="button"
                onClick={handleCreateProject}
                disabled={isMutating}
              >
                {isMutating ? <LoaderCircle className={styles.spin} size={18} /> : <FolderPlus size={18} />}
                Create project + key
              </button>
            </div>

            <div className={styles.projectList}>
              {projects.length === 0 ? (
                <p className="muted">Create your first project to start receiving events.</p>
              ) : null}
              {projects.map((project) => (
                <article
                  className={`panel panel-strong ${styles.projectCard}`}
                  key={project.id}
                >
                  <div className={styles.projectHead}>
                    <div>
                      <h3>{project.name}</h3>
                      <p className="muted mono">{project.keyPrefix ?? "No key yet"}</p>
                    </div>
                    {project.archivedAt ? <span className="tag">Archived</span> : null}
                  </div>
                  <div className={styles.projectActions}>
                    <button
                      className="chip-button"
                      type="button"
                      onClick={() => handleRegenerateKey(project.id, project.name)}
                      disabled={isMutating || Boolean(project.archivedAt)}
                    >
                      <KeyRound size={14} />
                      Regenerate key
                    </button>
                    <button
                      className="chip-button"
                      type="button"
                      onClick={() => handleArchiveProject(project.id)}
                      disabled={isMutating || Boolean(project.archivedAt)}
                    >
                      <Archive size={14} />
                      Archive
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <section className={styles.mainColumn}>
          <section className={`panel ${styles.filtersPanel}`}>
            <div className={styles.filterHeader}>
              <div>
                <p className="eyebrow">Monitor</p>
                <h2 className={styles.sectionTitle}>Live feed</h2>
              </div>
              <div className={styles.searchField}>
                <Search size={18} />
                <input
                  className={styles.searchInput}
                  placeholder="Search title, description, or tags"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className={styles.filterGrid}>
              <div>
                <label className="label" htmlFor="project-filter">
                  Project
                </label>
                <select
                  className="select"
                  id="project-filter"
                  value={filters.projectId}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      projectId: event.target.value,
                    }))
                  }
                >
                  <option value="all">All projects</option>
                  {projects
                    .filter((project) => !project.archivedAt)
                    .map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="channel-filter">
                  Channel
                </label>
                <select
                  className="select"
                  id="channel-filter"
                  value={filters.channel}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      channel: event.target.value,
                    }))
                  }
                >
                  <option value="all">All channels</option>
                  {channels.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="cluster">
              <button
                className="chip-button"
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                Reset filters
              </button>
              {filters.search ? (
                <span className="tag">
                  Matching <strong>{deferredSearch || filters.search}</strong>
                </span>
              ) : null}
            </div>
          </section>

          <section className={`panel ${styles.chartPanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Trend</p>
                <h2 className={styles.sectionTitle}>Hourly activity</h2>
              </div>
            </div>
            <ActivityChart data={activity} />
          </section>

          <section className={`panel ${styles.feedPanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Events</p>
                <h2 className={styles.sectionTitle}>Reverse chronological feed</h2>
              </div>
            </div>

            {isLoading ? (
              <div className={styles.loadingState}>
                <LoaderCircle className={styles.spin} size={24} />
                <span>Loading dashboard data…</span>
              </div>
            ) : null}

            {!isLoading && events.length === 0 ? (
              <div className={`grid-lines ${styles.emptyState}`}>
                <p className="eyebrow">No events yet</p>
                <h3>Once your apps send traffic, it lands here live.</h3>
                <p className="subtitle">
                  Use the generated API key and post JSON to the ingestion endpoint.
                </p>
              </div>
            ) : null}

            <div className={styles.feedList}>
              {events.map((event) => (
                <article className={`panel panel-strong ${styles.eventCard}`} key={event.id}>
                  <div className={styles.eventMeta}>
                    <div className={styles.iconWrap}>{event.icon ?? "•"}</div>
                    <div>
                      <div className={styles.eventHead}>
                        <h3>{event.title}</h3>
                        <span className="tag">{event.channel}</span>
                      </div>
                      <p className="muted">
                        {projectMap.get(event.projectId) ?? "Unknown project"} ·{" "}
                        {formatRelativeTime(event.createdAt)}
                      </p>
                    </div>
                  </div>
                  {event.description ? <p className={styles.description}>{event.description}</p> : null}
                  {event.tags.length > 0 ? (
                    <div className="cluster">
                      {event.tags.map((tag) => (
                        <span className="tag" key={`${event.id}-${tag}`}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
