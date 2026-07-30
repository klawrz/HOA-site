"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAssessment } from "@/app/actions/assessments"
import { AssessmentType } from "@/generated/prisma"

export function NewAssessmentDialog({
  detailBasePath,
  budgets,
}: {
  detailBasePath: string
  budgets: { id: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [type, setType] = useState<AssessmentType>("REGULAR_DUES")
  const [budgetId, setBudgetId] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createAssessment({
      title: form.get("title") as string,
      type,
      totalAmount: Number(form.get("totalAmount")),
      dueDate: form.get("dueDate") as string,
      budgetId: budgetId || undefined,
      notes: (form.get("notes") as string) || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Assessment created")
      setOpen(false)
      if (result.id) router.push(`${detailBasePath}/${result.id}`)
    } else {
      setError(result.error || "Failed to create assessment")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ New Assessment</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Assessment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" placeholder="e.g. 2027 Annual Dues, Roof Repair Cash Call" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType((v as AssessmentType) ?? "REGULAR_DUES")}
                items={{ REGULAR_DUES: "Regular Dues", SPECIAL: "Special Assessment" }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR_DUES">Regular Dues</SelectItem>
                  <SelectItem value="SPECIAL">Special Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Due date</Label>
              <Input name="dueDate" type="date" required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Total amount</Label>
            <Input name="totalAmount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
            <p className="text-xs text-gray-400">
              Split across units by each unit&apos;s allocation percentage.
            </p>
          </div>
          {budgets.length > 0 && (
            <div className="space-y-1">
              <Label>Linked budget (optional)</Label>
              <Select value={budgetId} onValueChange={(v) => setBudgetId(v ?? "")} items={Object.fromEntries(budgets.map((b) => [b.id, b.label]))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {budgets.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea name="notes" placeholder="Context for this assessment..." className="h-16 resize-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Assessment"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
