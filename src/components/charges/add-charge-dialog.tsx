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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createUnitCharge } from "@/app/actions/charges"
import { UnitChargeType } from "@/generated/prisma"
import { UNIT_CHARGE_TYPES, UNIT_CHARGE_TYPE_LABEL } from "@/lib/charges"
import { unitDisplayName } from "@/lib/unit-label-format"

const ALL = "__all__"

export function AddChargeDialog({
  unitLabel,
  units,
}: {
  unitLabel: string
  units: { id: string; number: string; building: string | null }[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [scope, setScope] = useState<string>(ALL)
  const [type, setType] = useState<UnitChargeType>("WATER")

  const scopeItems: Record<string, string> = { [ALL]: "All units" }
  for (const u of units) scopeItems[u.id] = unitDisplayName(unitLabel, u.number, u.building)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createUnitCharge({
      scope: scope === ALL ? "ALL" : "UNIT",
      unitId: scope === ALL ? undefined : scope,
      type,
      label: (form.get("label") as string) || undefined,
      amount: Number(form.get("amount")),
      chargedOn: form.get("chargedOn") as string,
      dueDate: (form.get("dueDate") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success(result.count && result.count > 1 ? `Charge added to ${result.count} units` : "Charge added")
      setOpen(false)
      setScope(ALL)
      setType("WATER")
      ;(e.target as HTMLFormElement).reset()
    } else {
      setError(result.error || "Failed to add charge")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Add Charge</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Charge</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-2">
          Ad-hoc charges outside dues and assessments — water, fees, or other. A Board member or the PM can
          raise them, for one unit or every unit.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Applies to</Label>
              <Select value={scope} onValueChange={(v) => setScope(v ?? ALL)} items={scopeItems}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All units</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {unitDisplayName(unitLabel, u.number, u.building)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType((v as UnitChargeType) ?? "WATER")}
                items={Object.fromEntries(UNIT_CHARGE_TYPES.map((t) => [t, UNIT_CHARGE_TYPE_LABEL[t]]))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_CHARGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{UNIT_CHARGE_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Input name="label" placeholder="e.g. Q1 sub-meter reading, gate remote replacement" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
              <p className="text-xs text-gray-400">Per unit</p>
            </div>
            <div className="space-y-1">
              <Label>Charge date</Label>
              <Input name="chargedOn" type="date" required />
            </div>
            <div className="space-y-1">
              <Label>Due date</Label>
              <Input name="dueDate" type="date" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea name="notes" placeholder="Context for this charge..." className="h-16 resize-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Charge"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
