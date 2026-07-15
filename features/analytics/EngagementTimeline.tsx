"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const ACCENT = "#ddb7ff"
const GRID = "rgba(255, 255, 255, 0.08)"
const MUTED_TEXT = "#cfc2d6"

export function EngagementTimeline({ data }: { data: { day: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="day"
            stroke={MUTED_TEXT}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke={MUTED_TEXT} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(255, 255, 255, 0.06)" }}
            contentStyle={{
              background: "#171f33",
              border: "1px solid rgba(221, 183, 255, 0.15)",
              borderRadius: 12,
              color: "#dae2fd",
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" name="Activity" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
