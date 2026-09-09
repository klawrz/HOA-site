"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
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
import { setBudgetMeta } from "@/app/actions/budgets"
import { Currency } from "@/generated/prisma"

const currencyLabel: Record<Currency, string> = { USD: "USD ($)", MXN: "MXN (pesos)" }

export function BudgetMetaDialog({
  budgetId,
  current,
}: {
  budgetId: string
  current: { year: number; periodLabel: string | null; version: string; currency: Currency; exchangeRate: number | null }
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currency, setCurrency] = useState<Currency>(current.currency)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const rateRaw = form.get("exchangeRate") as string
    const result = await setBudgetMeta(budgetId, {
      year: Number(form.get("year")),
      periodLabel: (form.get("periodLabel") as string) ?? "",
      version: form.get("version") as string,
      currency,
      exchangeRate: rateRaw === "" ? null : Number(rateRaw),
    })
    setSaving(false)
    if (result.success) {
      toast.success("Budget details updated")
      setOpen(false)
    } else {
      toast.error(result.error || "Failed to update")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
        <Pencil className="h-3.5 w-3.5" /> Details
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Budget details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Period</Label>
            <Input name="periodLabel" defaultValue={current.periodLabel ?? ""} placeholder="e.g. Fiscal 2027" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Anchor year</Label>
              <Input name="year" type="number" defaultValue={current.year} required />
            </div>
            <div className="space-y-1">
              <Label>Version</Label>
              <Input name="version" defaultValue={current.version} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency((v as Currency) ?? current.currency)} items={currencyLabel}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="MXN">MXN (pesos)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-400">Doesn&apos;t convert existing figures.</p>
            </div>
            <div className="space-y-1">
              <Label>Exchange rate</Label>
              <Input
                name="exchangeRate"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={current.exchangeRate ?? ""}
                placeholder="Pesos per 1 USD"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
