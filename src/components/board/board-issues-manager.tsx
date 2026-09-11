"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Check, RotateCcw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  boardIssueCategoryLabel,
  boardIssueStatusLabel,
  boardIssueSeverityLabel,
} from "@/lib/board-issues-shared"
import {
  upsertBoardIssue,
  setBoardIssueStatus,
  deleteBoardIssue,
} from "@/app/actions/board-issues"

export type BoardIssueView = {
  id: string
  title: string
  detail: string | null
  category: keyof typeof boardIssueCategoryLabel
  status: keyof typeof boardIssueStatusLabel
  severity: keyof typeof boardIssueSeverityLabel
  owner: string | null
  dueDate: string | null
  costEstimate: number | null
  costPending: boolean
  resolvedAt: string | null
}

const sevBadge: Record<BoardIssueView["severity"], string> = {
  CRITICAL: "bg-red-100 text-red-800",
  ATTENTION: "bg-amber-100 text-amber-800",
  INFO: "bg-blue-100 text-blue-800",
}
const statusBadge: Record<BoardIssueView["status"], string> = {
  OPEN: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  BLOCKED: "bg-red-100 text-red-800",
  RESOLVED: "bg-green-100 text-green-700",
}

function IssueDialog({
  issue,
  trigger,
}: {
  issue?: BoardIssueView
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [costPending, setCostPending] = useState(issue?.costPending ?? false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const r = await upsertBoardIssue(new FormData(e.currentTarget))
    setSaving(false)
    if (r.success) {
      toast.success(issue ? "Matter updated" : "Matter added")
      setOpen(false)
      router.refresh()
    } else {
      setError(r.error || "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{issue ? "Edit pending matter" : "Add a pending matter"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {issue && <input type="hidden" name="id" value={issue.id} />}
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" defaultValue={issue?.title ?? ""} required />
          </div>
          <div className="space-y-1">
            <Label>Detail / where it stands</Label>
            <Textarea name="detail" className="h-20 text-sm" defaultValue={issue?.detail ?? ""} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                name="category"
                defaultValue={issue?.category ?? "GOVERNANCE"}
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              >
                {Object.entries(boardIssueCategoryLabel).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Severity</Label>
              <select
                name="severity"
                defaultValue={issue?.severity ?? "ATTENTION"}
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              >
                {Object.entries(boardIssueSeverityLabel).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                name="status"
                defaultValue={issue?.status ?? "OPEN"}
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              >
                {Object.entries(boardIssueStatusLabel).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Owner (who&apos;s on it)</Label>
              <Input name="owner" placeholder="e.g. Gabriela, Accountant" defaultValue={issue?.owner ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Target date</Label>
              <Input name="dueDate" type="date" defaultValue={issue?.dueDate ?? ""} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="costPending"
                checked={costPending}
                onChange={(e) => setCostPending(e.target.checked)}
              />
              Cost not yet determined
            </label>
            {!costPending && (
              <Input
                name="costEstimate"
                type="number"
                min="0"
                step="1"
                placeholder="Estimated cost (org currency)"
                defaultValue={issue?.costEstimate ?? ""}
              />
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BoardIssuesManager({
  issues,
  canManage,
}: {
  issues: BoardIssueView[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showResolved, setShowResolved] = useState(false)

  const open = issues.filter((i) => i.status !== "RESOLVED")
  const resolved = issues.filter((i) => i.status === "RESOLVED")

  function status(id: string, s: string) {
    startTransition(async () => {
      const r = await setBoardIssueStatus(id, s)
      if (r.success) router.refresh()
      else toast.error(r.error || "Could not update")
    })
  }
  function remove(id: string) {
    if (!confirm("Delete this matter permanently?")) return
    startTransition(async () => {
      const r = await deleteBoardIssue(id)
      if (r.success) {
        toast.success("Deleted")
        router.refresh()
      } else toast.error(r.error || "Could not delete")
    })
  }

  const Row = ({ i }: { i: BoardIssueView }) => (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{i.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <Badge variant="outline">{boardIssueCategoryLabel[i.category]}</Badge>
            <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${sevBadge[i.severity]}`}>
              {boardIssueSeverityLabel[i.severity]}
            </span>
            <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${statusBadge[i.status]}`}>
              {boardIssueStatusLabel[i.status]}
            </span>
          </div>
          {i.detail && <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-line">{i.detail}</p>}
          <p className="text-[11px] text-gray-400 mt-1.5">
            {[
              i.owner && `Owner: ${i.owner}`,
              i.dueDate && `Target ${i.dueDate}`,
              i.costPending
                ? "Cost: to be determined"
                : i.costEstimate != null && `Est. ${Math.round(i.costEstimate).toLocaleString()}`,
            ]
              .filter(Boolean)
              .join(" · ") || "No owner or target set"}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-0.5 shrink-0">
            {i.status !== "RESOLVED" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => status(i.id, "RESOLVED")}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200"
              >
                <Check className="h-3.5 w-3.5" /> Resolve
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => status(i.id, "OPEN")}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reopen
              </button>
            )}
            <IssueDialog
              issue={i}
              trigger={
                <button type="button" className="p-1 text-gray-400 hover:text-gray-700" aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              }
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(i.id)}
              className="p-1 text-gray-400 hover:text-red-600"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {open.length} open · {resolved.length} resolved
        </p>
        {canManage && (
          <IssueDialog
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> Add matter
              </Button>
            }
          />
        )}
      </div>

      <div className="space-y-2">
        {open.length === 0 && (
          <p className="text-sm text-gray-400">No open matters.</p>
        )}
        {open.map((i) => (
          <Row key={i.id} i={i} />
        ))}
      </div>

      {resolved.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowResolved((s) => !s)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showResolved ? "Hide" : "Show"} {resolved.length} resolved
          </button>
          {showResolved && (
            <div className="space-y-2 mt-2 opacity-70">
              {resolved.map((i) => (
                <Row key={i.id} i={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
