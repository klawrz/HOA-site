"use client"

import { useMemo } from "react"
import { Building2, Trash2 } from "lucide-react"
import { deleteUnit } from "@/app/actions/org"
import { EditUnitDialog } from "./edit-unit-dialog"
import {
  ListSearch,
  ListFilterChips,
  ListPager,
  paginate,
  pageCountFor,
  useListControls,
  type ChipOption,
} from "@/components/ui/list-controls"

const PAGE_SIZE = 25

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  OWNER_OCCUPIED: "bg-blue-100 text-blue-700",
  RENTED: "bg-yellow-100 text-yellow-700",
  UNAVAILABLE: "bg-gray-100 text-gray-500",
}

const STATUS_ORDER = ["OWNER_OCCUPIED", "RENTED", "AVAILABLE", "UNAVAILABLE"] as const
const statusLabel = (s: string) => s.replace(/_/g, " ")

export type AccountUnitRow = {
  id: string
  number: string
  display: string
  building: string | null
  floor: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  description: string | null
  civicRoll: string | null
  status: string
  owner: { name: string | null; email: string | null } | null
  managerName: string | null
}

export function AccountUnitsList({
  units,
  unitLabel,
}: {
  units: AccountUnitRow[]
  unitLabel: string
}) {
  const { search, setSearch, filterFor, toggleFilter, page, setPage } = useListControls()
  const statusSel = filterFor("status")
  const buildingSel = filterFor("building")

  const noun = `${unitLabel.toLowerCase()}${units.length === 1 ? "" : "s"}`

  const statusOptions: ChipOption[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const u of units) counts.set(u.status, (counts.get(u.status) ?? 0) + 1)
    return STATUS_ORDER.filter((s) => counts.has(s)).map((s) => ({
      value: s,
      label: statusLabel(s),
      count: counts.get(s),
    }))
  }, [units])

  const buildingOptions: ChipOption[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const u of units) if (u.building) counts.set(u.building, (counts.get(u.building) ?? 0) + 1)
    return [...counts.keys()]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((b) => ({ value: b, label: `Bldg ${b}`, count: counts.get(b) }))
  }, [units])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return units.filter((u) => {
      if (statusSel.length > 0 && !statusSel.includes(u.status)) return false
      if (buildingSel.length > 0 && !(u.building && buildingSel.includes(u.building))) return false
      if (!q) return true
      const ownerText = `${u.owner?.name ?? ""} ${u.owner?.email ?? ""}`.toLowerCase()
      return (
        u.display.toLowerCase().includes(q) ||
        u.number.toLowerCase().includes(q) ||
        ownerText.includes(q)
      )
    })
  }, [units, search, statusSel, buildingSel])

  const pageCount = pageCountFor(filtered.length, PAGE_SIZE)
  const safePage = Math.min(page, pageCount)
  const visible = paginate(filtered, safePage, PAGE_SIZE)

  return (
    <div className="space-y-3">
      <ListSearch
        value={search}
        onChange={setSearch}
        placeholder={`Search by ${unitLabel.toLowerCase()} number or owner...`}
      />

      {(statusOptions.length > 1 || buildingOptions.length > 1) && (
        <div className="space-y-2">
          {statusOptions.length > 1 && (
            <ListFilterChips
              label="Status"
              options={statusOptions}
              selected={statusSel}
              onToggle={toggleFilter("status")}
            />
          )}
          {buildingOptions.length > 1 && (
            <ListFilterChips
              label="Building"
              options={buildingOptions}
              selected={buildingSel}
              onToggle={toggleFilter("building")}
            />
          )}
        </div>
      )}

      <div className="bg-white border rounded-xl divide-y">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>
              {units.length === 0
                ? `No ${unitLabel.toLowerCase()}s yet`
                : `No ${unitLabel.toLowerCase()}s match your search`}
            </p>
          </div>
        )}

        {visible.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <p className="font-medium">{u.display}</p>
                <p className="text-xs text-gray-400">
                  {[u.building, u.bedrooms && `${u.bedrooms}bd`, u.bathrooms && `${u.bathrooms}ba`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[u.status] ?? "bg-gray-100 text-gray-500"}`}
              >
                {statusLabel(u.status)}
              </span>
              <div className="text-right text-xs">
                {u.owner && <p className="text-gray-600">{u.owner.name ?? u.owner.email}</p>}
                {u.managerName && <p className="text-gray-400">UM: {u.managerName}</p>}
              </div>
              <EditUnitDialog
                unit={{
                  id: u.id,
                  number: u.number,
                  building: u.building,
                  floor: u.floor,
                  bedrooms: u.bedrooms,
                  bathrooms: u.bathrooms,
                  sqft: u.sqft,
                  description: u.description,
                  civicRoll: u.civicRoll,
                  owner: u.owner,
                }}
                unitLabel={unitLabel}
              />
              <form action={deleteUnit.bind(null, u.id)}>
                <button
                  type="submit"
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={`Delete ${u.display}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <ListPager
        page={safePage}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
        noun={noun}
      />
    </div>
  )
}
