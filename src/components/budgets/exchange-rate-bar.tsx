"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setExchangeRate } from "@/app/actions/budgets"
import { formatDateISO } from "@/lib/utils"
import { secondaryCurrency } from "@/lib/currency"
import { Currency } from "@/generated/prisma"

const currencyLabel: Record<Currency, string> = { USD: "USD", MXN: "MXN" }

export function ExchangeRateBar({
  baseCurrency,
  currentExchangeRate,
  exchangeRateUpdatedAt,
  canManage,
}: {
  baseCurrency: Currency
  currentExchangeRate: number | null
  exchangeRateUpdatedAt: Date | null
  canManage: boolean
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currency, setCurrency] = useState<Currency>(baseCurrency)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await setExchangeRate(Number(form.get("rate")), currency)
    setSaving(false)
    if (result.success) {
      toast.success("Exchange rate updated")
      setOpen(false)
    } else {
      toast.error(result.error ?? "Failed to update")
    }
  }

  if (!currentExchangeRate && !canManage) return null

  return (
    <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-blue-900">
        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
        {currentExchangeRate ? (
          <span>
            1 USD = {currentExchangeRate.toLocaleString()} MXN
            {exchangeRateUpdatedAt && (
              <span className="text-blue-500"> · updated {formatDateISO(exchangeRateUpdatedAt)}</span>
            )}
          </span>
        ) : (
          <span className="text-blue-500">No exchange rate set - budgeted/actual figures show in {baseCurrency} only.</span>
        )}
      </div>
      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            {currentExchangeRate ? "Update Rate" : "Set Exchange Rate"}
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Exchange Rate</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>This budget&apos;s currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency((v as Currency) ?? baseCurrency)} items={currencyLabel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="MXN">MXN</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">
                  Changing this doesn&apos;t convert existing figures - it only changes how new entries are treated going forward.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Pesos per 1 USD</Label>
                <Input
                  name="rate"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={currentExchangeRate ?? undefined}
                  placeholder="e.g. 17.50"
                  required
                />
                <p className="text-xs text-gray-400">
                  Used live for comparing actual spending to budget in {secondaryCurrency(currency)} - approved
                  budgets keep the rate that was in effect when they were approved.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
