import { z } from "zod";

export const eventIngestSchema = z.object({
  channel: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  icon: z.string().trim().max(16).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(64),
});

export const dashboardFiltersSchema = z.object({
  projectId: z.string().uuid().optional(),
  channel: z.string().trim().min(1).max(64).optional(),
  search: z.string().trim().max(120).optional(),
});
