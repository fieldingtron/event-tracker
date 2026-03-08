"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ActivityChart } from "@/components/dashboard/activity-chart";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { ActivityBucket, ChannelCount, DashboardEvent } from "@/lib/types";
import styles from "./project-view.module.css";

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

const CHANNEL_COLORS: Record<string, string> = {
  cart: "#F59E0B",
  orders: "#10B981",
  payments: "#10B981",
  billing: "#10B981",
  signups: "#3B82F6",
  users: "#3B82F6",
  deployments: "#8B5CF6",
  builds: "#8B5CF6",
  status: "#6B7280",
  alerts: "#EF4444",
  errors: "#EF4444",
  support: "#F97316",
  comments: "#06B6D4",
  subscribers: "#3B82F6",
  posts: "#10B981",
  analytics: "#8B5CF6",
  subscriptions: "#3B82F6",
  usage: "#F59E0B",
};

function getChannelColor(channel: string) {
  return CHANNEL_COLORS[channel.toLowerCase()] ?? "#6366f1";
}

type Tab = "feed" | "charts" | "insights" | "playground";

type ProjectViewProps = {
  projectId: string;
  projectName: string;
  initialEvents: DashboardEvent[];
  initialActivity: ActivityBucket[];
  initialChannels: ChannelCount[];
};

export function ProjectView({
  projectId,
  projectName,
  initialEvents,
  initialActivity,
  initialChannels,
}: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [events, setEvents] = useState<DashboardEvent[]>(initialEvents);
  const [activity, setActivity] = useState<ActivityBucket[]>(initialActivity);
  const [channels, setChannels] = useState<ChannelCount[]>(initialChannels);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const projectColor = getProjectColor(projectName);

  // Realtime subscription
  useEffect(() => {
    let client: ReturnType<typeof createBrowserClient>;
    try {
      client = createBrowserClient();
    } catch {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = (client.channel(`project-${projectId}`) as any)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `project_id=eq.${projectId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newEvent: DashboardEvent = {
            id: payload.new.id as string,
            projectId: payload.new.project_id as string,
            channel: payload.new.channel as string,
            title: payload.new.title as string,
            description: (payload.new.description as string | null) ?? null,
            icon: (payload.new.icon as string | null) ?? null,
            tags: (payload.new.tags as string[]) ?? [],
            createdAt: (payload.new.created_at as string) ?? new Date().toISOString(),
          };

          setEvents((prev) => [newEvent, ...prev].slice(0, 100));

          // Track for highlighting
          setNewEventIds((prev) => {
            const next = new Set(prev);
            next.add(newEvent.id);
            return next;
          });

          // Update channel counts
          setChannels((prev) => {
            const existing = prev.find((c) => c.channel === newEvent.channel);
            if (existing) {
              return prev.map((c) =>
                c.channel === newEvent.channel ? { ...c, count: c.count + 1 } : c,
              );
            }
            return [...prev, { channel: newEvent.channel, count: 1 }];
          });

          // Remove highlight after 5s
          setTimeout(() => {
            setNewEventIds((prev) => {
              const next = new Set(prev);
              next.delete(newEvent.id);
              return next;
            });
          }, 5000);
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(subscription);
    };
  }, [projectId]);

  const filteredEvents =
    activeChannel === "all"
      ? events
      : events.filter((e) => e.channel === activeChannel);

  const totalEvents = channels.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className={styles.shell}>
      {/* TOP NAV */}
      <nav className={styles.topNav}>
        <Link href="/" className={styles.homeLink}>
          <HomeIcon />
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span
          className={styles.projectDot}
          style={{ background: projectColor }}
        />
        <span className={styles.projectTitle}>{projectName}</span>

        <div className={styles.tabs}>
          {(["feed", "charts", "insights", "playground"] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      {/* FEED TAB */}
      {activeTab === "feed" && (
        <div className={styles.feedContainer}>
          <ChannelPills
            channels={channels}
            total={totalEvents}
            active={activeChannel}
            onChange={setActiveChannel}
          />
          {filteredEvents.length === 0 ? (
            <div className={styles.emptyFeed}>
              <p>No events yet. Send your first event using the API key.</p>
            </div>
          ) : (
            <div className={styles.eventList}>
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isNew={newEventIds.has(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHARTS TAB */}
      {activeTab === "charts" && (
        <div className={styles.tabContent}>
          <div className={styles.chartPanel}>
            <p className={styles.chartTitle}>Activity — last 24 hours</p>
            <ActivityChart data={activity} />
          </div>
        </div>
      )}

      {/* INSIGHTS TAB */}
      {activeTab === "insights" && (
        <InsightsTab
          events={events}
          channels={channels}
          totalEvents={totalEvents}
        />
      )}

      {/* PLAYGROUND TAB */}
      {activeTab === "playground" && (
        <PlaygroundTab projectName={projectName} />
      )}
    </div>
  );
}

// ─── Channel Pills ────────────────────────────────────────────────────────────

function ChannelPills({
  channels,
  total,
  active,
  onChange,
}: {
  channels: ChannelCount[];
  total: number;
  active: string;
  onChange: (channel: string) => void;
}) {
  return (
    <div className={styles.channelPills}>
      <button
        className={`${styles.channelPill} ${active === "all" ? styles.activePill : ""}`}
        onClick={() => onChange("all")}
      >
        All
        <span className={styles.pillCount}>{total}</span>
      </button>
      {channels.map((c) => (
        <button
          key={c.channel}
          className={`${styles.channelPill} ${active === c.channel ? styles.activePill : ""}`}
          onClick={() => onChange(c.channel)}
        >
          <span
            className={styles.channelDot}
            style={{
              background: active === c.channel ? "white" : getChannelColor(c.channel),
            }}
          />
          {c.channel}
          <span className={styles.pillCount}>{c.count}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, isNew }: { event: DashboardEvent; isNew: boolean }) {
  const tagPairs = chunkPairs(event.tags);

  return (
    <div className={styles.eventCard}>
      {isNew && <div className={styles.newIndicator} />}
      <div className={styles.eventIcon}>
        {event.icon ?? getDefaultIcon(event.channel)}
      </div>
      <div className={styles.eventBody}>
        <h3 className={styles.eventTitle}>{event.title}</h3>
        {event.description && (
          <p className={styles.eventDescription}>{event.description}</p>
        )}
        {tagPairs.length > 0 && (
          <div className={styles.eventTags}>
            {tagPairs.map(([key, value], i) => (
              <span key={i}>
                <span className={styles.tagKey}>{key}</span>
                <span className={styles.tagValue}>{value}</span>
              </span>
            ))}
          </div>
        )}
        <div className={styles.eventMeta}>
          <span
            className={styles.metaDot}
            style={{ background: getChannelColor(event.channel) }}
          />
          <span className={styles.metaChannel}>{event.channel}</span>
          <span className={styles.metaSep}>·</span>
          <span>{formatRelativeTime(event.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function chunkPairs(tags: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < tags.length; i += 2) {
    pairs.push([tags[i], tags[i + 1]]);
  }
  return pairs;
}

function getDefaultIcon(channel: string) {
  const ch = channel.toLowerCase();
  if (ch.startsWith("payment") || ch.startsWith("billing")) return "💳";
  if (ch.startsWith("order")) return "📦";
  if (ch.startsWith("signup") || ch.startsWith("user")) return "👤";
  if (ch.startsWith("deploy") || ch.startsWith("build")) return "🚀";
  if (ch.startsWith("alert") || ch.startsWith("error")) return "⚠️";
  if (ch.startsWith("support")) return "💬";
  if (ch.startsWith("cart")) return "🛒";
  if (ch.startsWith("review")) return "⭐";
  if (ch.startsWith("post")) return "📝";
  if (ch.startsWith("comment")) return "💬";
  if (ch.startsWith("subscriber")) return "📬";
  return "•";
}

function formatRelativeTime(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Insights Tab ─────────────────────────────────────────────────────────────

function InsightsTab({
  events,
  channels,
  totalEvents,
}: {
  events: DashboardEvent[];
  channels: ChannelCount[];
  totalEvents: number;
}) {
  const topChannel = channels[0] ?? null;
  const oldest = events.length > 0 ? events[events.length - 1] : null;
  const newest = events.length > 0 ? events[0] : null;
  const maxCount = channels[0]?.count ?? 1;

  return (
    <div className={styles.tabContent}>
      <div className={styles.insightGrid}>
        <div className={styles.insightCard}>
          <span className={styles.insightLabel}>Total Events</span>
          <span className={styles.insightValue}>{totalEvents.toLocaleString()}</span>
        </div>
        {topChannel && (
          <div className={styles.insightCard}>
            <span className={styles.insightLabel}>Top Channel</span>
            <span className={styles.insightValue}>{topChannel.channel}</span>
            <span className={styles.insightSub}>{topChannel.count} events</span>
          </div>
        )}
        {channels.length > 0 && (
          <div className={styles.insightCard}>
            <span className={styles.insightLabel}>Channels</span>
            <span className={styles.insightValue}>{channels.length}</span>
          </div>
        )}
        {newest && (
          <div className={styles.insightCard}>
            <span className={styles.insightLabel}>Last Event</span>
            <span className={styles.insightValue} style={{ fontSize: "1.1rem" }}>
              {formatRelativeTime(newest.createdAt)}
            </span>
          </div>
        )}
      </div>

      {channels.length > 0 && (
        <div className={styles.channelBars}>
          {channels.map((c) => (
            <div key={c.channel} className={styles.channelBar}>
              <span className={styles.channelBarLabel}>{c.channel}</span>
              <div className={styles.channelBarTrack}>
                <div
                  className={styles.channelBarFill}
                  style={{
                    width: `${(c.count / maxCount) * 100}%`,
                    background: getChannelColor(c.channel),
                  }}
                />
              </div>
              <span className={styles.channelBarCount}>{c.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Playground Tab ───────────────────────────────────────────────────────────

function PlaygroundTab({ projectName }: { projectName: string }) {
  const [apiKey, setApiKey] = useState<string>("");
  const [channel, setChannel] = useState("test");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/api-key")
      .then((r) => r.json())
      .then((d) => setApiKey(d.keyValue ?? ""))
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!title.trim()) return;
    setIsSending(true);
    setResult(null);
    try {
      const r = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          project: projectName,
          channel: channel.trim() || "test",
          title: title.trim(),
          description: description.trim() || undefined,
          icon: icon.trim() || undefined,
        }),
      });
      if (r.ok) {
        setResult({ ok: true, message: "Event sent successfully!" });
        setTitle("");
        setDescription("");
      } else {
        const d = await r.json();
        setResult({ ok: false, message: d.error ?? "Failed to send event." });
      }
    } catch {
      setResult({ ok: false, message: "Network error." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.playgroundPanel}>
        <h2 className={styles.playgroundTitle}>Send a test event</h2>
        <p className={styles.playgroundSubtitle}>
          Events are sent to <strong>{projectName}</strong> using your global API key.
        </p>

        <div className={styles.playgroundRow}>
          <div className={styles.playgroundField}>
            <label className="label">Channel *</label>
            <input
              className="input"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="e.g. signups"
            />
          </div>
          <div className={styles.playgroundField}>
            <label className="label">Icon</label>
            <input
              className="input"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. 🎉"
              maxLength={4}
            />
          </div>
        </div>

        <div className={styles.playgroundField}>
          <label className="label">Title *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. NEW USER REGISTERED"
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          />
        </div>

        <div className={styles.playgroundField}>
          <label className="label">Description</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <button
          className="button accent"
          onClick={handleSend}
          disabled={isSending || !title.trim() || !apiKey}
          style={{ alignSelf: "flex-start" }}
        >
          {isSending ? "Sending..." : "Send event"}
        </button>

        {result && (
          <div className={`${styles.playgroundResult} ${result.ok ? styles.success : styles.error}`}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
