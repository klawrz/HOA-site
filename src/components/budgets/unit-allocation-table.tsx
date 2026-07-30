"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Percent } from "lucide-react"
import { setUnitAllocation } from "@/app/actions/budgets"

interface UnitRow {
  id: string
  number: string
  building: string | null
  allocationPercent: number | null
}

function AllocationRow({ unit }: { unit: UnitRow }) {
  const [value, setValue] = useState(unit.allocationPercent != null ? String(unit.allocationPercent) : "")
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    const percent = value.trim() === "" ? null : Number(value)
    if (percent === unit.allocationPercent) return
    setSaving(true)
    const result = await setUnitAllocation(unit.id, percent)
    setSaving(false)
    if (!result.success) toast.error("Failed to update allocation")
  }

  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-sm font-medium">
        Unit {unit.number}
        {unit.building && ` — Building ${unit.building}`}
      </p>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          disabled={saving}
          className="w-20 h-8 text-right"
          placeholder="0"
        />
        <Percent className="h-3.5 w-3.5 text-gray-400" />
      </div>
    </div>
  )
}

export function UnitAllocationTable({ units }: { units: UnitRow[] }) {
  const total = units.reduce((s, u) => s + (u.allocationPercent ?? 0), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4" /> Unit Allocations
        </CardTitle>
        <p className="text-xs text-gray-400">
          Each unit&apos;s fixed share of common budget/dues, per the governing documents. Drives the dues
          estimate shown to Owners.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {units.map((u) => (
          <AllocationRow key={u.id} unit={u} />
        ))}
        {units.length === 0 && <p className="text-sm text-gray-500">No units yet.</p>}
        {units.length > 0 && (
          <p className={`text-xs pt-1 ${Math.abs(total - 100) < 0.01 ? "text-green-600" : "text-amber-600"}`}>
            Total: {total.toFixed(2)}% {Math.abs(total - 100) < 0.01 ? "✓" : "(should typically total 100%)"}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
