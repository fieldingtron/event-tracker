"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ActivityBucket } from "@/lib/types";

type ActivityChartProps = {
  data: ActivityBucket[];
};

function formatBucket(bucket: string) {
  const date = new Date(`${bucket}:00:00.000Z`);
  return date.toLocaleTimeString([], { hour: "numeric" });
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
          <XAxis
            dataKey="bucket"
            tickFormatter={formatBucket}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.25)",
              background: "rgba(255, 255, 255, 0.98)",
              fontSize: 13,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
            labelFormatter={(value) => new Date(`${value}:00:00.000Z`).toLocaleString()}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#4f46e5"
            strokeWidth={3}
            fill="url(#activityFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
