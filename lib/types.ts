export type Project = {
  id: string;
  name: string;
  createdAt: string;
  eventCount: number;
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

export type ChannelCount = {
  channel: string;
  count: number;
};

export type SettingsRecord = {
  keyValue: string;
  keyPrefix: string;
  createdAt: string;
};
