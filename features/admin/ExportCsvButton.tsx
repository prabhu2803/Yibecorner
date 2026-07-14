"use client"

import { Button } from "@/components/ui/button"

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

/**
 * Builds a CSV client-side from data already fetched server-side (no round
 * trip needed) and triggers a browser download. `rows` are plain objects;
 * keys become the header row in insertion order.
 */
export function ExportCsvButton({ rows, filename }: { rows: Record<string, unknown>[]; filename: string }) {
  function handleExport() {
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const lines = [
      headers.map(toCsvValue).join(","),
      ...rows.map((row) => headers.map((h) => toCsvValue(row[h])).join(",")),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
      Export CSV
    </Button>
  )
}
