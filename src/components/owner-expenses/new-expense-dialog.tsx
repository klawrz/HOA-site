"use client"

import { useState } from "react"
import { toast } from "sonner"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createOwnerExpense } from "@/app/actions/owner-expenses"
import { ExpenseCategory } from "@/generated/prisma"

const categoryLabel: Record<ExpenseCategory, string> = {
  RECURRING: "Recurring",
  DUES: "Dues",
  MAINTENANCE: "Maintenance",
  CAPITAL: "Capital",
  CLEANING: "Cleaning",
  OTHER: "Other",
}

interface UnitOption {
  id: string
  number: string
  building: string | null
}

export function NewExpenseDialog({ units }: { units: UnitOption[] }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [unitId, setUnitId] = useState(units[0]?.id ?? "")
  const [category, setCategory] = useState<ExpenseCategory>("OTHER")

  const unitLabel = (u: UnitOption) => `Unit ${u.number}${u.building ? ` — Building ${u.building}` : ""}`

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createOwnerExpense({
      unitId,
      category,
      amount: Number(form.get("amount")),
      date: form.get("date") as string,
      description: form.get("description") as string,
      notes: (form.get("notes") as string) || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Expense logged")
      setOpen(false)
    } else {
      setError(result.error || "Failed to log expense")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Add Expense</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {units.length > 1 && (
            <div className="space-y-1">
              <Label>Unit</Label>
              <Select
                value={unitId}
                onValueChange={(v) => setUnitId(v ?? "")}
                items={Object.fromEntries(units.map((u) => [u.id, unitLabel(u)]))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{unitLabel(u)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" required />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory((v as ExpenseCategory) ?? "OTHER")} items={categoryLabel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input name="description" placeholder="e.g. Handyman - fixed leaking faucet" required />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input name="notes" placeholder="e.g. paid cash, receipt on file" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !unitId}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
