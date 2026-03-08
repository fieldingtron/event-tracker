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
          <CartesianGrid stroke="rgba(24, 34, 30, 0.08)" vertical={false} />
          <XAxis
            dataKey="bucket"
            tickFormatter={formatBucket}
            tick={{ fill: "#62726a", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#62726a", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(24, 34, 30, 0.08)",
              background: "rgba(255, 248, 236, 0.96)",
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
