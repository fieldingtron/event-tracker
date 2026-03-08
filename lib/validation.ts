import { z } from "zod";

export const eventIngestSchema = z.object({
  project: z.string().trim().min(1).max(64),
  channel: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  icon: z.string().trim().max(16).optional().nullable(),
  tags: z.record(z.string().trim().min(1).max(40), z.string().trim().max(80)).optional().nullable(),
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(64),
});

export const projectFiltersSchema = z.object({
  channel: z.string().trim().min(1).max(64).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
