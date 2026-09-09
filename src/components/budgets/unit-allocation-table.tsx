"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Percent } from "lucide-react"
import { setUnitAllocation } from "@/app/actions/budgets"
import {
  ListSearch,
  ListPager,
  paginate,
  pageCountFor,
  useListControls,
} from "@/components/ui/list-controls"

const PAGE_SIZE = 25

interface UnitRow {
  id: string
  number: string
  building: string | null
  allocationPercent: number | null
}

function AllocationRow({ unit, unitLabel }: { unit: UnitRow; unitLabel: string }) {
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
        {unitLabel} {unit.number}
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

export function UnitAllocationTable({ units, unitLabel }: { units: UnitRow[]; unitLabel: string }) {
  const { search, setSearch, page, setPage } = useListControls()

  // The total is always over every unit - search / pagination only narrow
  // which rows are shown for editing.
  const total = units.reduce((s, u) => s + (u.allocationPercent ?? 0), 0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return units
    return units.filter(
      (u) =>
        u.number.toLowerCase().includes(q) ||
        `${unitLabel} ${u.number}`.toLowerCase().includes(q) ||
        (u.building ?? "").toLowerCase().includes(q)
    )
  }, [units, search, unitLabel])

  const pageCount = pageCountFor(filtered.length, PAGE_SIZE)
  const safePage = Math.min(page, pageCount)
  const visible = paginate(filtered, safePage, PAGE_SIZE)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4" /> {unitLabel} Allocations
        </CardTitle>
        <p className="text-xs text-gray-400">
          Each {unitLabel.toLowerCase()}&apos;s fixed share of common budget/dues, per the governing documents. Drives the dues
          estimate shown to Owners.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {units.length > 8 && (
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder={`Search by ${unitLabel.toLowerCase()} number...`}
          />
        )}
        {visible.map((u) => (
          <AllocationRow key={u.id} unit={u} unitLabel={unitLabel} />
        ))}
        {units.length === 0 && <p className="text-sm text-gray-500">No units yet.</p>}
        {units.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-gray-400">No {unitLabel.toLowerCase()}s match your search.</p>
        )}
        <ListPager
          page={safePage}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
          noun={`${unitLabel.toLowerCase()}s`}
        />
        {units.length > 0 && (
          <p className={`text-xs pt-1 ${Math.abs(total - 100) < 0.01 ? "text-green-600" : "text-amber-600"}`}>
            Total (all {units.length} {unitLabel.toLowerCase()}s): {total.toFixed(2)}%{" "}
            {Math.abs(total - 100) < 0.01 ? "✓" : "(should typically total 100%)"}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
