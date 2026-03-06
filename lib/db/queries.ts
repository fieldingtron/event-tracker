import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { hashApiKey, generateApiKey } from "@/lib/api-keys";
import { db } from "@/lib/db/client";
import { events, projectApiKeys, projects } from "@/lib/db/schema";
import type { ActivityBucket, DashboardEvent, DashboardProject } from "@/lib/types";
import {
  dashboardFiltersSchema,
  eventIngestSchema,
} from "@/lib/validation";

type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;
type EventPayload = z.infer<typeof eventIngestSchema>;

function buildUserProjectFilter(userId: string, filters: DashboardFilters) {
  const conditions = [
    eq(projects.userId, userId),
  ];

  if (filters.projectId) {
    conditions.push(eq(events.projectId, filters.projectId));
  }

  if (filters.channel) {
    conditions.push(eq(events.channel, filters.channel));
  }

  if (filters.search?.trim()) {
    conditions.push(
      sql`"events"."search_document" @@ websearch_to_tsquery('english', ${filters.search.trim()})`,
    );
  }

  return and(...conditions);
}

export async function getProjectsForUser(userId: string): Promise<DashboardProject[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      archivedAt: projects.archivedAt,
      keyPrefix: sql<string | null>`
        (
          select ${projectApiKeys.keyPrefix}
          from ${projectApiKeys}
          where ${projectApiKeys.projectId} = ${projects.id}
            and ${projectApiKeys.revokedAt} is null
          order by ${projectApiKeys.createdAt} desc
          limit 1
        )
      `,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
  }));
}

export async function createProjectWithApiKey(userId: string, name: string) {
  const { key, hash, prefix } = generateApiKey();
  const project = await db.transaction(async (tx) => {
    const [createdProject] = await tx
      .insert(projects)
      .values({
        userId,
        name,
      })
      .returning({
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
        archivedAt: projects.archivedAt,
      });

    await tx.insert(projectApiKeys).values({
      projectId: createdProject.id,
      keyHash: hash,
      keyPrefix: prefix,
    });

    return createdProject;
  });

  return {
    apiKey: key,
    project: {
      ...project,
      keyPrefix: prefix,
      createdAt: project.createdAt.toISOString(),
      archivedAt: null,
    } satisfies DashboardProject,
  };
}

export async function archiveProject(userId: string, projectId: string) {
  const project = await db.transaction(async (tx) => {
    const [updatedProject] = await tx
      .update(projects)
      .set({
        archivedAt: sql`now()`,
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning({ id: projects.id });

    if (!updatedProject) {
      return null;
    }

    await tx
      .update(projectApiKeys)
      .set({
        revokedAt: sql`now()`,
      })
      .where(and(eq(projectApiKeys.projectId, projectId), isNull(projectApiKeys.revokedAt)));

    return updatedProject;
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }
}

export async function regenerateProjectApiKey(userId: string, projectId: string) {
  const { key, hash, prefix } = generateApiKey();
  const project = await db.transaction(async (tx) => {
    const [existingProject] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.userId, userId),
          isNull(projects.archivedAt),
        ),
      )
      .limit(1);

    if (!existingProject) {
      return null;
    }

    await tx
      .update(projectApiKeys)
      .set({
        revokedAt: sql`now()`,
      })
      .where(and(eq(projectApiKeys.projectId, projectId), isNull(projectApiKeys.revokedAt)));

    await tx.insert(projectApiKeys).values({
      projectId,
      keyHash: hash,
      keyPrefix: prefix,
    });

    return existingProject;
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  return {
    apiKey: key,
    prefix,
  };
}

export async function getEventsForUser(
  userId: string,
  filters: DashboardFilters,
): Promise<DashboardEvent[]> {
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
    .innerJoin(projects, eq(projects.id, events.projectId))
    .where(buildUserProjectFilter(userId, filters))
    .orderBy(desc(events.createdAt))
    .limit(100);

  return rows.map((row) => ({
    ...row,
    tags: row.tags ?? [],
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getActivityForUser(
  userId: string,
  filters: DashboardFilters,
): Promise<ActivityBucket[]> {
  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId));

  const projectIds = projectRows.map((project) => project.id);

  if (projectIds.length === 0) {
    return [];
  }

  const conditions = [inArray(events.projectId, projectIds)];

  if (filters.projectId) {
    conditions.push(eq(events.projectId, filters.projectId));
  }

  if (filters.channel) {
    conditions.push(eq(events.channel, filters.channel));
  }

  if (filters.search?.trim()) {
    conditions.push(
      sql`"events"."search_document" @@ websearch_to_tsquery('english', ${filters.search.trim()})`,
    );
  }

  const rows = await db.execute(sql`
    with buckets as (
      select generate_series(
        date_trunc('hour', now() - interval '23 hour'),
        date_trunc('hour', now()),
        interval '1 hour'
      ) as bucket
    ),
    matching_events as (
      select date_trunc('hour', ${events.createdAt}) as bucket
      from ${events}
      where ${and(...conditions)}
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

export async function insertEventByApiKey(apiKey: string, payload: EventPayload) {
  const keyHash = hashApiKey(apiKey);

  const [keyRecord] = await db
    .select({
      projectId: projectApiKeys.projectId,
    })
    .from(projectApiKeys)
    .innerJoin(projects, eq(projects.id, projectApiKeys.projectId))
    .where(
      and(
        eq(projectApiKeys.keyHash, keyHash),
        isNull(projectApiKeys.revokedAt),
        isNull(projects.archivedAt),
      ),
    )
    .limit(1);

  if (!keyRecord) {
    throw new Error("INVALID_API_KEY");
  }

  const [event] = await db
    .insert(events)
    .values({
      projectId: keyRecord.projectId,
      channel: payload.channel,
      title: payload.title,
      description: payload.description ?? null,
      icon: payload.icon ?? null,
      tags: payload.tags ?? [],
    })
    .returning({
      id: events.id,
      projectId: events.projectId,
      createdAt: events.createdAt,
    });

  return event;
}
