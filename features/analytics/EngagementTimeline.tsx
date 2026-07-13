"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const ACCENT = "oklch(0.78 0.15 70)"
const GRID = "oklch(1 0 0 / 8%)"
const MUTED_TEXT = "oklch(0.72 0.03 288)"

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
            cursor={{ fill: "oklch(1 0 0 / 6%)" }}
            contentStyle={{
              background: "oklch(0.21 0.045 288)",
              border: "1px solid oklch(1 0 0 / 12%)",
              borderRadius: 12,
              color: "oklch(0.96 0.01 290)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" name="Activity" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
