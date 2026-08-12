"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { bulkInviteOwners } from "@/app/actions/invites"

type Row = { unitNumber: string; email: string; name: string }
type Status = "ready" | "no-unit" | "invalid-email" | "duplicate"
type PreviewRow = Row & { status: Status }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.some((f) => f.trim() !== "")) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field)
    if (row.some((f) => f.trim() !== "")) rows.push(row)
  }
  return rows
}

function toRows(text: string): Row[] {
  const table = parseCSV(text)
  if (table.length === 0) return []

  // Detect a header row by column names - if none found, assume column
  // order (unit, email, name) so a plain paste with no header still works.
  const header = table[0].map((h) => h.trim().toLowerCase())
  const unitIdx = header.findIndex((h) => h.includes("unit"))
  const emailIdx = header.findIndex((h) => h.includes("email"))
  const nameIdx = header.findIndex((h) => h.includes("name"))
  const hasHeader = unitIdx !== -1 && emailIdx !== -1

  const dataRows = hasHeader ? table.slice(1) : table
  const uIdx = hasHeader ? unitIdx : 0
  const eIdx = hasHeader ? emailIdx : 1
  const nIdx = hasHeader ? nameIdx : 2

  return dataRows
    .map((r) => ({
      unitNumber: (r[uIdx] ?? "").trim(),
      email: (r[eIdx] ?? "").trim(),
      name: nIdx !== -1 ? (r[nIdx] ?? "").trim() : "",
    }))
    .filter((r) => r.unitNumber || r.email)
}

export function BulkInviteOwnersDialog({ units }: { units: { id: string; number: string }[] }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const unitNumbers = new Set(units.map((u) => u.number.trim().toLowerCase()))

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ""))
    reader.readAsText(file)
  }

  const rows = toRows(text)
  const seen = new Set<string>()
  const preview: PreviewRow[] = rows.map((r) => {
    let status: Status = "ready"
    if (!unitNumbers.has(r.unitNumber.toLowerCase())) status = "no-unit"
    else if (!EMAIL_RE.test(r.email)) status = "invalid-email"
    else if (seen.has(r.email.toLowerCase())) status = "duplicate"
    if (status === "ready") seen.add(r.email.toLowerCase())
    return { ...r, status }
  })
  const readyCount = preview.filter((r) => r.status === "ready").length

  async function handleSubmit() {
    setError("")
    const ready = preview.filter((r) => r.status === "ready")
    if (ready.length === 0) {
      setError("Nothing ready to invite yet")
      return
    }
    setSaving(true)
    try {
      const result = await bulkInviteOwners(ready.map((r) => ({ unitNumber: r.unitNumber, email: r.email })))
      const notes = [
        result.skippedNoUnit.length > 0 && `${result.skippedNoUnit.length} unmatched unit${result.skippedNoUnit.length === 1 ? "" : "s"}`,
        result.skippedInvalidEmail.length > 0 && `${result.skippedInvalidEmail.length} invalid email${result.skippedInvalidEmail.length === 1 ? "" : "s"}`,
        result.skippedDuplicate.length > 0 && `${result.skippedDuplicate.length} duplicate${result.skippedDuplicate.length === 1 ? "" : "s"}`,
      ].filter(Boolean)
      toast.success(`Sent ${result.created} invite${result.created === 1 ? "" : "s"}${notes.length > 0 ? ` (skipped ${notes.join(", ")})` : ""}`)
      setOpen(false)
      setText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invites")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Upload className="h-3.5 w-3.5" /> Import CSV
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import owners from CSV</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-gray-500">
          Columns: <span className="font-mono">Unit Number, Email, Name</span> (Name is optional, shown
          below for your own reference only). Each unit number is matched against your existing{" "}
          {units.length} unit{units.length === 1 ? "" : "s"} - upload a file or paste the CSV text directly.
        </p>

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose CSV file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ""
            }}
          />
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Unit Number,Email,Name\nVilla-1,owner1@example.com,Jane Diaz\nVilla-2,owner2@example.com,Marco Reyes"}
          className="h-28 font-mono text-xs"
        />

        {preview.length > 0 && (
          <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
            {preview.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="font-medium text-gray-700 shrink-0 w-20 truncate">{r.unitNumber || "—"}</span>
                  <span className="text-gray-500 truncate">{r.email || "—"}</span>
                  {r.name && <span className="text-gray-400 truncate hidden sm:inline">{r.name}</span>}
                </div>
                <span
                  className={`text-xs font-medium shrink-0 ${
                    r.status === "ready"
                      ? "text-green-700"
                      : r.status === "duplicate"
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {r.status === "ready" && "Ready"}
                  {r.status === "no-unit" && "No matching unit"}
                  {r.status === "invalid-email" && "Invalid email"}
                  {r.status === "duplicate" && "Duplicate"}
                </span>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || readyCount === 0}>
            {saving ? "Sending..." : `Send ${readyCount || ""} Invite${readyCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
