"use client";

import { useState } from "react";

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

const SCENARIOS: Scenario[] = [
  {
    id: "quickshop",
    label: "QuickShop",
    subtitle: "E-commerce",
    icon: "cart",
    events: [
      { project: "QuickShop", channel: "signups", title: "NEW USER REGISTERED", description: "user_alice signed up from US", tags: { country: "US", plan: "starter" } },
      { project: "QuickShop", channel: "orders", title: "NEW ORDER PLACED", description: "2x Wireless Headphones - Total: $89.99", tags: { order_id: "ORD-001", total: "89.99", items: "2" } },
      { project: "QuickShop", channel: "payments", title: "PAYMENT SUCCESSFUL", description: "$89.99 charged via Visa", tags: { amount: "89.99", currency: "USD", method: "visa" } },
      { project: "QuickShop", channel: "cart", title: "ITEM ADDED TO CART", description: "Sony WH-1000XM5 Headphones", tags: { sku: "SNY-WH5", price: "349.99" } },
      { project: "QuickShop", channel: "support", title: "TICKET OPENED", description: "user_bob asked: Where is my order?", tags: { user: "user_bob", priority: "normal" } },
    ],
  },
  {
    id: "launchpad",
    label: "LaunchPad SaaS",
    subtitle: "Subscriptions",
    icon: "rocket",
    events: [
      { project: "LaunchPad SaaS", channel: "signups", title: "NEW TRIAL STARTED", description: "company_xyz started a 14-day trial", tags: { company: "company_xyz", seats: "5" } },
      { project: "LaunchPad SaaS", channel: "subscriptions", title: "PLAN UPGRADED", description: "company_xyz upgraded to Business", tags: { company: "company_xyz", from: "starter", to: "business" } },
      { project: "LaunchPad SaaS", channel: "billing", title: "INVOICE PAID", description: "$299 invoice paid", tags: { company: "company_xyz", amount: "299", period: "monthly" } },
      { project: "LaunchPad SaaS", channel: "usage", title: "QUOTA REACHED", description: "company_abc hit 10,000 API calls", tags: { company: "company_abc", metric: "api_calls", limit: "10000" } },
      { project: "LaunchPad SaaS", channel: "billing", title: "PAYMENT FAILED", description: "Invoice INV-042 could not be charged", tags: { invoice: "INV-042", attempt: "2" } },
    ],
  },
  {
    id: "deploybot",
    label: "DeployBot",
    subtitle: "CI/CD pipeline",
    icon: "gear",
    events: [
      { project: "DeployBot", channel: "deployments", title: "DEPLOYMENT STARTED", description: "main to production (v2.4.1)", tags: { branch: "main", env: "production", version: "2.4.1" } },
      { project: "DeployBot", channel: "builds", title: "BUILD TRIGGERED", description: "PR #142 build started", tags: { pr: "142", branch: "feature/auth" } },
      { project: "DeployBot", channel: "builds", title: "BUILD PASSED", description: "247 tests passed in 3m12s", tags: { pr: "142", tests: "247", duration: "3m12s" } },
      { project: "DeployBot", channel: "alerts", title: "UPTIME ALERT", description: "api.example.com returned 503 for 2 minutes", tags: { host: "api.example.com", code: "503", duration: "2m" } },
      { project: "DeployBot", channel: "status", title: "SERVICE RESTORED", description: "Database pool recovered", tags: { service: "postgres", latency: "12ms" } },
    ],
  },
  {
    id: "blogwave",
    label: "BlogWave",
    subtitle: "Content platform",
    icon: "pen",
    events: [
      { project: "BlogWave", channel: "posts", title: "POST PUBLISHED", description: "Getting Started with TypeScript went live", tags: { slug: "getting-started-ts", author: "alice" } },
      { project: "BlogWave", channel: "subscribers", title: "NEW SUBSCRIBER", description: "reader@example.com subscribed", tags: { email: "reader@example.com", list: "weekly_digest" } },
      { project: "BlogWave", channel: "comments", title: "NEW COMMENT", description: "Great post! Very helpful.", tags: { post: "getting-started-ts", user: "user_dave" } },
      { project: "BlogWave", channel: "analytics", title: "TRAFFIC SPIKE", description: "Post trending on social media", tags: { post: "getting-started-ts", views: "4200" } },
      { project: "BlogWave", channel: "posts", title: "POST DRAFTED", description: "Advanced React Patterns saved as draft", tags: { slug: "advanced-react", author: "bob" } },
    ],
  },
];

const ALL_SCENARIO: Scenario = {
  id: "all",
  label: "All Scenarios",
  subtitle: "All projects at once",
  icon: "box",
  events: SCENARIOS.flatMap((s) => s.events),
};

const ALL_SCENARIOS = [...SCENARIOS, ALL_SCENARIO];
const SEND_BATCH_SIZE = 5;

export function SampleDataLoader({ apiKey, onLoad }: { apiKey: string | null; onLoad: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });

  const handleLoad = async (scenarioId: string) => {
    if (!apiKey) return;
    const scenario = ALL_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;

    setSending(scenarioId);
    setProgress({ sent: 0, total: scenario.events.length });

    let sent = 0;

    for (let i = 0; i < scenario.events.length; i += SEND_BATCH_SIZE) {
      const batch = scenario.events.slice(i, i + SEND_BATCH_SIZE);
      await Promise.all(
        batch.map((event) =>
          fetch("/api/events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(event),
          }).catch(() => undefined),
        ),
      );

      sent += batch.length;
      setProgress({ sent, total: scenario.events.length });
    }

    setSending(null);
    onLoad();
  };

  return (
    <div className={styles.sampleSection}>
      <button className={styles.sampleToggle} onClick={() => setExpanded((e) => !e)}>
        <span>Load sample data</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
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
              Sending events... {progress.sent}/{progress.total}
            </p>
          )}
        </>
      )}
    </div>
  );
}
