"use client"

import * as React from "react"
import Link from "next/link"
import { Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/shared/GlassCard"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PublicChallenge, PublicConnection, PublicParticipant } from "@/lib/queries/board"
import { CHALLENGE_CATEGORY_META, INDUSTRY_META, type ChallengeCategory, type Industry } from "@/lib/constants"
import { cn } from "@/lib/utils"

type Tab = "challenges" | "participants" | "connections"

function label(value: string): string {
  return value.replace(/_/g, " ")
}

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => {
    const str = String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n")
}

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function DownloadCsvButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
    >
      <Download className="size-3.5" /> Download CSV
    </button>
  )
}

function TabPill({
  tab,
  setTab,
  counts,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  counts: Record<Tab, number>
}) {
  const tabs: { key: Tab; title: string }[] = [
    { key: "challenges", title: "Challenges" },
    { key: "participants", title: "Participants" },
    { key: "connections", title: "Connections" },
  ]
  return (
    <div className="glass-card flex w-fit flex-wrap gap-1 rounded-full p-1">
      {tabs.map(({ key, title }) => (
        <button
          key={key}
          type="button"
          onClick={() => setTab(key)}
          className={cn(
            "font-[family-name:var(--font-jetbrains-mono)] rounded-full px-4 py-1.5 text-[11px] tracking-widest uppercase transition",
            tab === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {title} ({counts[key]})
        </button>
      ))}
    </div>
  )
}

function ChallengesView({ challenges, joinHref }: { challenges: PublicChallenge[]; joinHref: string }) {
  const [category, setCategory] = React.useState<ChallengeCategory | "all">("all")
  const [status, setStatus] = React.useState<"all" | "open" | "solved">("all")
  const [search, setSearch] = React.useState("")

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return challenges.filter((c) => {
      if (category !== "all" && c.category !== CHALLENGE_CATEGORY_META[category].label) return false
      if (status !== "all" && c.status !== status) return false
      if (q && !c.title.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false
      return true
    })
  }, [challenges, category, status, search])

  function exportCsv() {
    downloadCsv(
      "yibe-corner-challenges.csv",
      visible.map((c) => ({
        Title: c.title,
        Description: c.description,
        Category: c.category ?? "",
        Status: c.status,
        Author: c.authorName,
        Responses: c.responseCount,
      }))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search challenges..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-white/5"
        />
        <Select value={category} onValueChange={(v) => setCategory(v as ChallengeCategory | "all")}>
          <SelectTrigger className="w-[180px] bg-white/5">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(CHALLENGE_CATEGORY_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="glass-card flex gap-1 rounded-full p-1">
          {(["all", "open", "solved"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs uppercase transition",
                status === key ? "bg-primary/15 text-primary" : "text-muted-foreground"
              )}
            >
              {key}
            </button>
          ))}
        </div>
        <DownloadCsvButton onClick={exportCsv} />
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((c) => (
          <GlassCard key={c.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-foreground">{c.title}</p>
              {c.status === "solved" && <Badge className="shrink-0 bg-primary/20 text-primary">Solved</Badge>}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>by {c.authorName}{c.category ? ` · ${c.category}` : ""}</span>
              <span>{c.responseCount} responses</span>
            </div>
          </GlassCard>
        ))}
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground">No challenges match these filters yet.</p>
        )}
      </div>

      <Link
        href={joinHref}
        className="font-[family-name:var(--font-jetbrains-mono)] w-fit rounded-full border border-primary/40 px-4 py-2 text-xs tracking-widest text-primary uppercase transition hover:bg-primary/10 active:scale-95"
      >
        Post your challenge
      </Link>
    </div>
  )
}

function ParticipantsView({ participants, joinHref }: { participants: PublicParticipant[]; joinHref: string }) {
  const [industry, setIndustry] = React.useState<Industry | "all">("all")
  const [search, setSearch] = React.useState("")

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return participants.filter((p) => {
      if (industry !== "all" && p.industry !== industry) return false
      if (q && !p.fullName.toLowerCase().includes(q) && !(p.company ?? "").toLowerCase().includes(q)) return false
      return true
    })
  }, [participants, industry, search])

  function exportCsv() {
    downloadCsv(
      "yibe-corner-participants.csv",
      visible.map((p) => ({
        Name: p.fullName,
        Company: p.company ?? "",
        Designation: p.designation ?? "",
        City: p.city ?? "",
        Industry: label(p.industry),
        "Business Stage": label(p.businessStage),
        "Looking For": p.lookingFor.map(label).join("; "),
        "Can Help With": p.canHelpWith.map(label).join("; "),
      }))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-white/5"
        />
        <Select value={industry} onValueChange={(v) => setIndustry(v as Industry | "all")}>
          <SelectTrigger className="w-[180px] bg-white/5">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All industries</SelectItem>
            {Object.entries(INDUSTRY_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DownloadCsvButton onClick={exportCsv} />
      </div>

      <GlassCard className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Looking for</TableHead>
              <TableHead>Can help with</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((p) => (
              <TableRow key={p.id} className="hover:bg-white/5">
                <TableCell className="font-medium text-foreground">{p.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{p.company ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{label(p.industry)}</TableCell>
                <TableCell className="text-muted-foreground">{label(p.businessStage)}</TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground">
                  {p.lookingFor.map(label).join(", ")}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground">
                  {p.canHelpWith.map(label).join(", ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {visible.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No participants match these filters yet.</p>
        )}
      </GlassCard>

      <Link
        href={joinHref}
        className="font-[family-name:var(--font-jetbrains-mono)] w-fit rounded-full border border-primary/40 px-4 py-2 text-xs tracking-widest text-primary uppercase transition hover:bg-primary/10 active:scale-95"
      >
        Join the board
      </Link>
    </div>
  )
}

function ConnectionsView({ connections }: { connections: PublicConnection[] }) {
  const [search, setSearch] = React.useState("")

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return connections
    return connections.filter(
      (c) => c.requesterName.toLowerCase().includes(q) || c.recipientName.toLowerCase().includes(q)
    )
  }, [connections, search])

  function exportCsv() {
    downloadCsv(
      "yibe-corner-connections.csv",
      visible.map((c) => ({
        Requester: c.requesterName,
        Recipient: c.recipientName,
        "Verified At": c.verifiedAt ?? "",
      }))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-white/5"
        />
        <DownloadCsvButton onClick={exportCsv} />
      </div>

      <div className="flex flex-col gap-2">
        {visible.map((c) => (
          <GlassCard key={c.id} className="flex items-center justify-between gap-3 p-3">
            <p className="text-sm text-foreground">
              <span className="font-medium">{c.requesterName}</span>
              <span className="mx-2 text-primary">↔</span>
              <span className="font-medium">{c.recipientName}</span>
            </p>
            {c.verifiedAt && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(c.verifiedAt).toLocaleDateString()}
              </span>
            )}
          </GlassCard>
        ))}
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground">No verified connections match yet.</p>
        )}
      </div>
    </div>
  )
}

export function LiveBoard({
  challenges,
  participants,
  connections,
  eventSlug,
}: {
  challenges: PublicChallenge[]
  participants: PublicParticipant[]
  connections: PublicConnection[]
  eventSlug: string
}) {
  const [tab, setTab] = React.useState<Tab>("challenges")
  const joinHref = `/join/${eventSlug}`

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-[family-name:var(--font-orbitron)] text-2xl font-bold uppercase tracking-tight">
          Live Board
        </h2>
        <p className="text-sm text-muted-foreground">
          Real problems and real people from this event — no login required to browse.
        </p>
      </div>

      <TabPill
        tab={tab}
        setTab={setTab}
        counts={{
          challenges: challenges.length,
          participants: participants.length,
          connections: connections.length,
        }}
      />

      {tab === "challenges" && <ChallengesView challenges={challenges} joinHref={joinHref} />}
      {tab === "participants" && <ParticipantsView participants={participants} joinHref={joinHref} />}
      {tab === "connections" && <ConnectionsView connections={connections} />}
    </div>
  )
}
