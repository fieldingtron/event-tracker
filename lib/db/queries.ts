import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { generateApiKey } from "@/lib/api-keys";
import { db } from "@/lib/db/client";
import { events, projects, settings } from "@/lib/db/schema";
import type {
  ActivityBucket,
  ChannelCount,
  DashboardEvent,
  Project,
  SettingsRecord,
} from "@/lib/types";



function tagsToArray(tags: Record<string, string> | null | undefined): string[] {
  if (!tags) return [];
  return Object.entries(tags).flatMap(([k, v]) => [k, v]);
}

// ─── Settings / Global API Key ───────────────────────────────────────────────

export async function getSettings(userId: string): Promise<SettingsRecord | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.id, "default"), eq(settings.userId, userId)))
    .limit(1);

  if (!row) return null;
  return {
    keyValue: row.keyValue,
    keyPrefix: row.keyPrefix,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getOrCreateSettings(userId: string): Promise<SettingsRecord> {
  const existing = await getSettings(userId);
  if (existing) return existing;

  const { key, prefix } = generateApiKey();
  await db
    .insert(settings)
    .values({ userId, keyValue: key, keyPrefix: prefix })
    .onConflictDoNothing();

  const record = await getSettings(userId);
  if (!record) throw new Error("Failed to initialize settings");
  return record;
}

export async function regenerateSettings(userId: string): Promise<SettingsRecord> {
  const { key, prefix } = generateApiKey();

  const [updated] = await db
    .update(settings)
    .set({ keyValue: key, keyPrefix: prefix })
    .where(and(eq(settings.id, "default"), eq(settings.userId, userId)))
    .returning();

  if (updated) {
    return {
      keyValue: updated.keyValue,
      keyPrefix: updated.keyPrefix,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  const [inserted] = await db
    .insert(settings)
    .values({ userId, keyValue: key, keyPrefix: prefix })
    .returning();

  return {
    keyValue: inserted.keyValue,
    keyPrefix: inserted.keyPrefix,
    createdAt: inserted.createdAt.toISOString(),
  };
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjects(userId: string): Promise<Project[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      eventCount: sql<number>`count(${events.id})::int`,
    })
    .from(projects)
    .leftJoin(events, eq(events.projectId, projects.id))
    .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getProjectById(id: string, userId: string): Promise<Project | null> {
  const [row] = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      eventCount: sql<number>`count(${events.id})::int`,
    })
    .from(projects)
    .leftJoin(events, eq(events.projectId, projects.id))
    .where(and(eq(projects.id, id), eq(projects.userId, userId), isNull(projects.archivedAt)))
    .groupBy(projects.id)
    .limit(1);

  if (!row) return null;
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function getProjectByName(name: string, userId: string): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(
      and(
        sql`lower(${projects.name}) = lower(${name})`,
        eq(projects.userId, userId),
        isNull(projects.archivedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function createProject(name: string, userId: string): Promise<Project> {
  const [project] = await db
    .insert(projects)
    .values({ userId, name })
    .returning({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
    });

  return { ...project, eventCount: 0, createdAt: project.createdAt.toISOString() };
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getProjectEvents(
  projectId: string,
  userId: string,
  filters: { channel?: string; search?: string; limit?: number },
): Promise<DashboardEvent[]> {
  // First, verify the user owns this project
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error("Unauthorized or project not found");

  const conditions = [eq(events.projectId, projectId)];

  if (filters.channel) {
    conditions.push(eq(events.channel, filters.channel));
  }

  if (filters.search?.trim()) {
    conditions.push(
      sql`"events"."search_document" @@ websearch_to_tsquery('english', ${filters.search.trim()})`,
    );
  }

  const rows = await db
    .select({
      id: events.id,
      projectId: events.projectId,
      channel: events.channel,
      title: events.title,
      description: events.description,
      icon: events.icon,
      tags: events.tags,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.createdAt))
    .limit(filters.limit ?? 100);

  return rows.map((row) => ({
    ...row,
    tags: row.tags ?? [],
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getProjectActivity(projectId: string, userId: string): Promise<ActivityBucket[]> {
  // First, verify the user owns this project
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error("Unauthorized or project not found");

  const rows = await db.execute(sql`
    with buckets as (
      select generate_series(
        date_trunc('hour', now() - interval '23 hour'),
        date_trunc('hour', now()),
        interval '1 hour'
      ) as bucket
    ),
    matching_events as (
      select date_trunc('hour', created_at) as bucket
      from events
      where project_id = ${projectId}
    )
    select
      to_char(buckets.bucket at time zone 'utc', 'YYYY-MM-DD"T"HH24') as bucket,
      count(matching_events.bucket)::int as count
    from buckets
    left join matching_events on matching_events.bucket = buckets.bucket
    group by buckets.bucket
    order by buckets.bucket
  `);

  return (rows as unknown as { bucket: string; count: number }[]).map((row) => ({
    bucket: row.bucket,
    count: Number(row.count),
  }));
}

export async function getProjectChannels(projectId: string, userId: string): Promise<ChannelCount[]> {
  // First, verify the user owns this project
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error("Unauthorized or project not found");

  const rows = await db
    .select({
      channel: events.channel,
      count: sql<number>`count(*)::int`,
    })
    .from(events)
    .where(eq(events.projectId, projectId))
    .groupBy(events.channel)
    .orderBy(desc(sql`count(*)`));

  return rows.map((row) => ({ channel: row.channel, count: row.count }));
}

export async function insertEvent(
  projectId: string,
  userId: string,
  payload: {
    channel: string;
    title: string;
    description?: string | null;
    icon?: string | null;
    tags?: Record<string, string> | null;
  },
) {
  // First, verify the user owns this project 
  // Optionally bypassed if checking at the API level via API keys, 
  // but good defense in depth
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error("Unauthorized or project not found");

  const [event] = await db
    .insert(events)
    .values({
      projectId,
      channel: payload.channel,
      title: payload.title,
      description: payload.description ?? null,
      icon: payload.icon ?? null,
      tags: tagsToArray(payload.tags),
    })
    .returning({
      id: events.id,
      projectId: events.projectId,
      createdAt: events.createdAt,
    });

  return event;
}
