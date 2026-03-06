export type DashboardProject = {
  id: string;
  name: string;
  archivedAt: string | null;
  createdAt: string;
  keyPrefix: string | null;
};

export type DashboardEvent = {
  id: string;
  projectId: string;
  channel: string;
  title: string;
  description: string | null;
  icon: string | null;
  tags: string[];
  createdAt: string;
};

export type ActivityBucket = {
  bucket: string;
  count: number;
};

export type DashboardQueryState = {
  projectId: string;
  channel: string;
  search: string;
};
