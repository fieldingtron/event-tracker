"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Project } from "@/lib/types";
import styles from "./home-view.module.css";

type SampleEvent = {
  project: string;
  channel: string;
  title: string;
  description: string;
  tags?: Record<string, string>;
  icon?: string;
};

type Scenario = {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  events: SampleEvent[];
};

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

  const maskedKey = keyPrefix
    ? `${keyPrefix}${"•".repeat(30)}`
    : `ev_${"•".repeat(36)}`;

  return (
    <main className={`app-shell ${styles.page}`}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <RssIcon />
          <h1 className={styles.title}>Events Dashboard</h1>
        </div>
        <p className={styles.subtitle}>Your projects, your events, all in one place.</p>
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
            {revealedKey ? (copied ? "Copied!" : "Copy") : isRevealing ? "..." : "Reveal"}
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
              onClick={() => router.push(`/project/${p.id}`)}
            >
              <div
                className={styles.projectCardTop}
                style={{ background: getProjectColor(p.name) }}
              >
                <span className={styles.projectInitials}>{getInitials(p.name)}</span>
              </div>
              <div className={styles.projectCardBottom}>
                <span className={styles.projectName}>{p.name}</span>
                <span className={styles.projectCount}>{p.eventCount} events</span>
              </div>
            </button>
          ))}
          <button className={styles.newProjectCard} onClick={() => setIsCreating(true)}>
            <span className={styles.plusIcon}>+</span>
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

// ─── Sample Data Loader ───────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: "quickshop",
    label: "QuickShop",
    subtitle: "E-commerce",
    icon: "🛒",
    events: [
      { project: "QuickShop", channel: "signups", title: "NEW USER REGISTERED", description: "user_alice signed up from US", tags: { country: "US", plan: "starter" } },
      { project: "QuickShop", channel: "orders", title: "NEW ORDER PLACED", description: "2x Wireless Headphones — Total: $89.99", tags: { order_id: "ORD-001", total: "89.99", items: "2" } },
      { project: "QuickShop", channel: "payments", title: "PAYMENT SUCCESSFUL", description: "$89.99 charged via Visa", tags: { amount: "89.99", currency: "USD", method: "visa" } },
      { project: "QuickShop", channel: "cart", title: "ITEM ADDED TO CART", description: "Sony WH-1000XM5 Headphones", tags: { sku: "SNY-WH5", price: "349.99" } },
      { project: "QuickShop", channel: "signups", title: "NEW USER REGISTERED", description: "user_bob signed up from JP", tags: { country: "JP", plan: "pro" } },
      { project: "QuickShop", channel: "orders", title: "ORDER SHIPPED", description: "Order ORD-001 dispatched via FedEx", tags: { order_id: "ORD-001", carrier: "FedEx", tracking: "FX928374" } },
      { project: "QuickShop", channel: "payments", title: "PAYMENT FAILED", description: "Card declined for order ORD-002", tags: { order_id: "ORD-002", reason: "insufficient_funds" } },
      { project: "QuickShop", channel: "reviews", title: "NEW REVIEW SUBMITTED", description: "5-star review on Wireless Headphones", tags: { rating: "5", product: "WH-1000XM5" } },
      { project: "QuickShop", channel: "cart", title: "CART ABANDONED", description: "user_carol left 3 items ($124.50) in cart", tags: { items: "3", value: "124.50", user: "user_carol" } },
      { project: "QuickShop", channel: "orders", title: "ORDER DELIVERED", description: "ORD-001 delivered successfully", tags: { order_id: "ORD-001", status: "delivered" } },
      { project: "QuickShop", channel: "support", title: "TICKET OPENED", description: "user_bob: Where is my order?", tags: { user: "user_bob", priority: "normal" } },
      { project: "QuickShop", channel: "payments", title: "REFUND PROCESSED", description: "$89.99 refunded for ORD-001", tags: { order_id: "ORD-001", amount: "89.99" } },
      { project: "QuickShop", channel: "signups", title: "USER UPGRADED PLAN", description: "user_alice upgraded from starter to pro", tags: { user: "user_alice", from: "starter", to: "pro" } },
      { project: "QuickShop", channel: "support", title: "TICKET RESOLVED", description: "Shipping delay resolved for user_bob", tags: { user: "user_bob", resolution: "refund" } },
      { project: "QuickShop", channel: "orders", title: "ORDER CANCELLED", description: "ORD-003 cancelled by customer", tags: { order_id: "ORD-003", reason: "changed_mind" } },
    ],
  },
  {
    id: "launchpad",
    label: "LaunchPad SaaS",
    subtitle: "Subscriptions & usage",
    icon: "🚀",
    events: [
      { project: "LaunchPad SaaS", channel: "signups", title: "NEW TRIAL STARTED", description: "company_xyz started a 14-day trial", tags: { company: "company_xyz", seats: "5" } },
      { project: "LaunchPad SaaS", channel: "subscriptions", title: "PLAN UPGRADED", description: "company_xyz upgraded to Business", tags: { company: "company_xyz", from: "starter", to: "business" } },
      { project: "LaunchPad SaaS", channel: "billing", title: "INVOICE PAID", description: "$299/mo invoice paid by company_xyz", tags: { company: "company_xyz", amount: "299", period: "monthly" } },
      { project: "LaunchPad SaaS", channel: "usage", title: "QUOTA REACHED", description: "company_abc hit 10,000 API calls limit", tags: { company: "company_abc", metric: "api_calls", limit: "10000" } },
      { project: "LaunchPad SaaS", channel: "signups", title: "ONBOARDING COMPLETED", description: "company_xyz completed setup wizard", tags: { company: "company_xyz", steps: "5" } },
      { project: "LaunchPad SaaS", channel: "subscriptions", title: "SUBSCRIPTION CANCELLED", description: "company_def cancelled after 3 months", tags: { company: "company_def", reason: "too_expensive" } },
      { project: "LaunchPad SaaS", channel: "billing", title: "PAYMENT FAILED", description: "Invoice #INV-042 could not be charged", tags: { invoice: "INV-042", attempt: "2" } },
      { project: "LaunchPad SaaS", channel: "usage", title: "FEATURE MILESTONE", description: "company_xyz sent 1,000th email via API", tags: { company: "company_xyz", feature: "email_api", milestone: "1000" } },
      { project: "LaunchPad SaaS", channel: "subscriptions", title: "PLAN DOWNGRADED", description: "company_ghi downgraded to Starter", tags: { company: "company_ghi", from: "pro", to: "starter" } },
      { project: "LaunchPad SaaS", channel: "signups", title: "NEW TRIAL STARTED", description: "solo_dev started a 14-day trial", tags: { company: "solo_dev", seats: "1" } },
    ],
  },
  {
    id: "deploybot",
    label: "DeployBot",
    subtitle: "CI/CD pipeline",
    icon: "⚙️",
    events: [
      { project: "DeployBot", channel: "deployments", title: "DEPLOYMENT STARTED", description: "main → production (v2.4.1)", tags: { branch: "main", env: "production", version: "2.4.1" } },
      { project: "DeployBot", channel: "builds", title: "BUILD TRIGGERED", description: "PR #142 build started by @alice", tags: { pr: "142", author: "alice", branch: "feature/auth" } },
      { project: "DeployBot", channel: "builds", title: "BUILD PASSED", description: "PR #142 all 247 tests passed in 3m12s", tags: { pr: "142", tests: "247", duration: "3m12s" } },
      { project: "DeployBot", channel: "deployments", title: "DEPLOYMENT SUCCEEDED", description: "v2.4.1 deployed to production ✓", tags: { version: "2.4.1", env: "production", duration: "45s" } },
      { project: "DeployBot", channel: "builds", title: "BUILD FAILED", description: "PR #143 failed: TypeScript error in auth.ts", tags: { pr: "143", error: "type_error", file: "auth.ts" } },
      { project: "DeployBot", channel: "alerts", title: "UPTIME ALERT", description: "api.example.com returned 503 for 2 minutes", tags: { host: "api.example.com", code: "503", duration: "2m" } },
      { project: "DeployBot", channel: "deployments", title: "DEPLOYMENT FAILED", description: "v2.4.2 rollback triggered — health check failed", tags: { version: "2.4.2", reason: "health_check_failed" } },
      { project: "DeployBot", channel: "status", title: "SERVICE DEGRADED", description: "Database pool exhausted — elevated latency", tags: { service: "postgres", latency: "820ms", severity: "medium" } },
      { project: "DeployBot", channel: "status", title: "SERVICE RESTORED", description: "Database pool recovered — latency normal", tags: { service: "postgres", latency: "12ms" } },
      { project: "DeployBot", channel: "alerts", title: "ERROR SPIKE DETECTED", description: "500 errors increased 400% in last 5 minutes", tags: { spike: "400%", window: "5m", threshold: "50" } },
    ],
  },
  {
    id: "blogwave",
    label: "BlogWave",
    subtitle: "Content platform",
    icon: "✍️",
    events: [
      { project: "BlogWave", channel: "posts", title: "POST PUBLISHED", description: "\"Getting Started with TypeScript\" went live", tags: { slug: "getting-started-ts", author: "alice", category: "tutorial" } },
      { project: "BlogWave", channel: "subscribers", title: "NEW SUBSCRIBER", description: "reader@example.com subscribed to Weekly Digest", tags: { email: "reader@example.com", list: "weekly_digest" } },
      { project: "BlogWave", channel: "comments", title: "NEW COMMENT", description: "user_dave: \"Great post! Very helpful.\"", tags: { post: "getting-started-ts", user: "user_dave" } },
      { project: "BlogWave", channel: "analytics", title: "TRAFFIC SPIKE", description: "\"Getting Started with TypeScript\" trending on HN", tags: { post: "getting-started-ts", source: "hacker_news", views: "4200" } },
      { project: "BlogWave", channel: "posts", title: "POST DRAFTED", description: "\"Advanced React Patterns\" saved as draft", tags: { slug: "advanced-react", author: "bob", status: "draft" } },
      { project: "BlogWave", channel: "comments", title: "COMMENT FLAGGED", description: "Spam detected on post advanced-react", tags: { post: "advanced-react", reason: "spam" } },
      { project: "BlogWave", channel: "subscribers", title: "UNSUBSCRIBED", description: "user@example.com unsubscribed from Weekly Digest", tags: { list: "weekly_digest", reason: "too_frequent" } },
      { project: "BlogWave", channel: "analytics", title: "MILESTONE REACHED", description: "Blog hit 100,000 total page views!", tags: { milestone: "100k_views", total: "100423" } },
      { project: "BlogWave", channel: "comments", title: "COMMENT APPROVED", description: "Flagged comment reviewed and approved", tags: { post: "advanced-react", action: "approved" } },
      { project: "BlogWave", channel: "posts", title: "POST PUBLISHED", description: "\"Advanced React Patterns\" is now live", tags: { slug: "advanced-react", author: "bob", category: "advanced" } },
    ],
  },
];

const ALL_SCENARIO: typeof SCENARIOS[0] = {
  id: "all",
  label: "All Scenarios",
  subtitle: "All 4 projects at once",
  icon: "📦",
  events: SCENARIOS.flatMap((s) => s.events),
};

const ALL_SCENARIOS = [...SCENARIOS, ALL_SCENARIO];

function SampleDataLoader({ apiKey, onLoad }: { apiKey: string | null; onLoad: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });

  const handleLoad = async (scenarioId: string) => {
    if (!apiKey) return;
    const scenario = ALL_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;

    setSending(scenarioId);
    setProgress({ sent: 0, total: scenario.events.length });

    for (let i = 0; i < scenario.events.length; i++) {
      await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(scenario.events[i]),
      }).catch(() => {});
      setProgress({ sent: i + 1, total: scenario.events.length });
    }

    setSending(null);
    onLoad();
  };

  return (
    <div className={styles.sampleSection}>
      <button className={styles.sampleToggle} onClick={() => setExpanded((e) => !e)}>
        Load sample data {expanded ? "▲" : "▼"}
      </button>

      {expanded && (
        <>
          <div className={styles.sampleGrid}>
            {ALL_SCENARIOS.map((s) => (
              <button
                key={s.id}
                className={styles.sampleCard}
                onClick={() => handleLoad(s.id)}
                disabled={sending !== null || !apiKey}
                title={!apiKey ? "Reveal your API key first" : undefined}
              >
                <span className={styles.sampleCardIcon}>{s.icon}</span>
                <span className={styles.sampleCardText}>
                  <span className={styles.sampleCardName}>{s.label}</span>
                  <span className={styles.sampleCardSub}>{s.subtitle}</span>
                </span>
              </button>
            ))}
          </div>
          {sending && (
            <p className={styles.sampleProgress}>
              Sending events… {progress.sent}/{progress.total}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function RssIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#rssGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="rssGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill="url(#rssGrad)" stroke="none" />
    </svg>
  );
}

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
