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
import { setReservePolicyFigures } from "@/app/actions/reserve-fund"
import type { ResolvedReservePolicy } from "@/lib/reserve-policy-summary"

const n = (v: FormDataEntryValue | null) => {
  const s = (v as string)?.trim() ?? ""
  return s === "" ? null : Number(s)
}
const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`

export function ReservePolicyFiguresDialog({ current }: { current: ResolvedReservePolicy }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  // Live preview of the derived figures as the form is edited.
  const [preview, setPreview] = useState({
    coveragePct: current.coveragePct,
    floor: current.floor,
    shortfallToClose: current.shortfallToClose,
    budgetLineUsd: current.budgetLineUsd,
  })

  function recompute(formEl: HTMLFormElement) {
    const f = new FormData(formEl)
    const balance = Math.max(0, n(f.get("balance")) ?? current.balance)
    const target = Math.max(0, n(f.get("target")) ?? current.target)
    const topUpYears = Math.max(1, Math.round(n(f.get("topUpYears")) ?? current.topUpYears))
    const floorPct = Math.min(100, Math.max(0, Math.round(n(f.get("floorPct")) ?? current.floorPct)))
    const override = n(f.get("budgetLineUsd"))
    const shortfallToClose = Math.max(0, Math.round(target - balance))
    setPreview({
      coveragePct: target > 0 ? Math.round((balance / target) * 100) : 0,
      floor: Math.round((target * floorPct) / 100),
      shortfallToClose,
      budgetLineUsd: override != null && override >= 0 ? override : Math.round(shortfallToClose / topUpYears),
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const f = new FormData(e.currentTarget)
    const result = await setReservePolicyFigures({
      revision: (f.get("revision") as string) ?? "",
      status: (f.get("status") as string) ?? "",
      asOf: (f.get("asOf") as string) ?? "",
      balance: n(f.get("balance")),
      target: n(f.get("target")),
      topUpYears: n(f.get("topUpYears")),
      floorPct: n(f.get("floorPct")),
      exchangeRate: n(f.get("exchangeRate")),
      roofYear: n(f.get("roofYear")),
      roofDrawdown: n(f.get("roofDrawdown")),
      budgetYear: n(f.get("budgetYear")),
      budgetLineUsd: n(f.get("budgetLineUsd")),
    })
    setSaving(false)
    if (result.success) {
      toast.success("Reserve fund policy figures updated")
      setOpen(false)
    } else {
      setError(result.error || "Failed to update figures")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit figures</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reserve Fund Policy figures</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-2">
          Adjust these after an AGM motion, or when the real numbers come in. Coverage, the floor,
          the shortfall and the top-up are calculated from what you enter.
        </p>
        <form onSubmit={handleSubmit} onChange={(e) => recompute(e.currentTarget)} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Revision</Label>
              <Input name="revision" defaultValue={current.revision} placeholder="2" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Status</Label>
              <Input name="status" defaultValue={current.status} placeholder="Adopted at 2027 AGM" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>As-of label</Label>
            <Input name="asOf" defaultValue={current.asOf} placeholder="start of 2026" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Reserve balance (USD)</Label>
              <Input name="balance" type="number" min="0" step="1" defaultValue={current.balance} />
            </div>
            <div className="space-y-1">
              <Label>Target level (USD)</Label>
              <Input name="target" type="number" min="0" step="1" defaultValue={current.target} />
            </div>
            <div className="space-y-1">
              <Label>Years to top up</Label>
              <Input name="topUpYears" type="number" min="1" step="1" defaultValue={current.topUpYears} />
            </div>
            <div className="space-y-1">
              <Label>Minimum floor (% of target)</Label>
              <Input name="floorPct" type="number" min="0" max="100" step="1" defaultValue={current.floorPct} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Roof year</Label>
              <Input name="roofYear" type="number" step="1" defaultValue={current.roofYear} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Roof drawdown (USD)</Label>
              <Input name="roofDrawdown" type="number" min="0" step="1" defaultValue={current.roofDrawdown} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Coming budget year</Label>
              <Input name="budgetYear" type="number" step="1" defaultValue={current.budgetYear} />
            </div>
            <div className="space-y-1">
              <Label>Exchange rate (MXN per USD)</Label>
              <Input name="exchangeRate" type="number" min="0" step="0.01" defaultValue={current.exchangeRate} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Budget top-up override (USD, optional)</Label>
            <Input
              name="budgetLineUsd"
              type="number"
              min="0"
              step="1"
              defaultValue={current.budgetLineUsdOverride ?? undefined}
              placeholder={`Leave blank to use the calculated ${usd(preview.shortfallToClose)} ÷ years`}
            />
            <p className="text-xs text-gray-400">Set this only if the Board fixes a specific figure by motion.</p>
          </div>

          <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5">Calculated</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
              <span className="text-gray-500">Coverage</span><span className="text-right">{preview.coveragePct}%</span>
              <span className="text-gray-500">Minimum floor</span><span className="text-right">{usd(preview.floor)}</span>
              <span className="text-gray-500">Shortfall to close</span><span className="text-right">{usd(preview.shortfallToClose)}</span>
              <span className="text-gray-500 font-medium">Budget top-up / year</span><span className="text-right font-semibold">{usd(preview.budgetLineUsd)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
