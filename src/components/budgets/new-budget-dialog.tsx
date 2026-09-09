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
import { createBudget } from "@/app/actions/budgets"
import { BudgetType, Currency } from "@/generated/prisma"

const currencyLabel: Record<Currency, string> = { USD: "USD ($)", MXN: "MXN (pesos)" }

export function NewBudgetDialog({
  detailBasePath,
  type,
  triggerLabel = "+ New Budget",
  previousBudget,
  defaultCurrency = "USD",
}: {
  detailBasePath: string
  type: BudgetType
  triggerLabel?: string
  previousBudget?: { id: string; year: number; version: string; lineItemCount: number } | null
  defaultCurrency?: Currency
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cloneFromPrevious, setCloneFromPrevious] = useState(!!previousBudget)
  const [currency, setCurrency] = useState<Currency>(defaultCurrency)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const rate = form.get("exchangeRate") ? Number(form.get("exchangeRate")) : null
    const result = await createBudget({
      year: Number(form.get("year")),
      periodLabel: (form.get("periodLabel") as string) || undefined,
      version: form.get("version") as string,
      currency,
      exchangeRate: rate,
      type,
      notes: (form.get("notes") as string) || undefined,
      cloneFromBudgetId: cloneFromPrevious ? previousBudget?.id : undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Budget created")
      setOpen(false)
      if (result.id) router.push(`${detailBasePath}/${result.id}`)
    } else {
      toast.error(result.error || "Failed to create budget")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>{triggerLabel}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New {type === "CAPITAL" ? "Capital Expenditure" : "Operating"} Budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Period</Label>
            <Input name="periodLabel" placeholder="e.g. Fiscal 2027, or Jul 2026 – Jun 2027" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Anchor year</Label>
              <Input name="year" type="number" defaultValue={new Date().getFullYear() + 1} required />
            </div>
            <div className="space-y-1">
              <Label>Version</Label>
              <Input name="version" placeholder="Proposed, Revised…" defaultValue="Proposed" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency((v as Currency) ?? "USD")} items={currencyLabel}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="MXN">MXN (pesos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Exchange rate</Label>
              <Input name="exchangeRate" type="number" min="0.01" step="0.01" placeholder="Pesos per 1 USD" />
              <p className="text-[11px] text-gray-400">Optional — drives the converted column.</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea name="notes" placeholder="Context for this version…" className="h-16 resize-none" />
          </div>
          {previousBudget && (
            <label className="flex items-start gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cloneFromPrevious}
                onChange={(e) => setCloneFromPrevious(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Start from {previousBudget.year} — {previousBudget.version}
                <span className="block text-xs text-gray-400">
                  Copies its {previousBudget.lineItemCount} line item{previousBudget.lineItemCount !== 1 ? "s" : ""}{" "}
                  as a starting point, with its actuals carried in as this budget&apos;s prior-year reference.
                </span>
              </span>
            </label>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
