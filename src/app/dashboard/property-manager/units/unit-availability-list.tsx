"use client"

import { useMemo } from "react"
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

const policyConfig: Record<string, { label: string; color: string; dot: string }> = {
  ANYONE: { label: "Open to Anyone", color: "bg-green-100 text-green-800", dot: "bg-green-500" },
  FRIENDS_FAMILY_ONLY: { label: "Friends & Family", color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
  SHORT_TERM_RENTAL: { label: "Short-Term Rental", color: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  NOT_RENTING: { label: "Not Renting", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
}
const POLICY_ORDER = ["ANYONE", "FRIENDS_FAMILY_ONLY", "SHORT_TERM_RENTAL", "NOT_RENTING"] as const

const statusConfig: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "Available", color: "bg-emerald-100 text-emerald-800" },
  RENTED: { label: "Rented", color: "bg-blue-100 text-blue-800" },
  OWNER_OCCUPIED: { label: "Owner Occupied", color: "bg-indigo-100 text-indigo-800" },
  UNAVAILABLE: { label: "Unavailable", color: "bg-gray-100 text-gray-600" },
}
const STATUS_ORDER = ["OWNER_OCCUPIED", "RENTED", "AVAILABLE", "UNAVAILABLE"] as const

export type PMUnitRow = {
  id: string
  number: string
  building: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  status: string
  rentalPolicy: string
  ownerName: string | null
  ownerEmail: string | null
  ownerPhone: string | null
  renterName: string | null
  renterEmail: string | null
  renterEndDate: string | null
  notes: string | null
}

export function UnitAvailabilityList({
  units,
  unitLabel,
}: {
  units: PMUnitRow[]
  unitLabel: string
}) {
  const { search, setSearch, filterFor, toggleFilter, page, setPage } = useListControls()
  const statusSel = filterFor("status")
  const policySel = filterFor("policy")
  const buildingSel = filterFor("building")

  const noun = `${unitLabel.toLowerCase()}${units.length === 1 ? "" : "s"}`

  const statusOptions: ChipOption[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const u of units) counts.set(u.status, (counts.get(u.status) ?? 0) + 1)
    return STATUS_ORDER.filter((s) => counts.has(s)).map((s) => ({
      value: s,
      label: statusConfig[s]?.label ?? s,
      count: counts.get(s),
    }))
  }, [units])

  const policyOptions: ChipOption[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const u of units) counts.set(u.rentalPolicy, (counts.get(u.rentalPolicy) ?? 0) + 1)
    return POLICY_ORDER.filter((p) => counts.has(p)).map((p) => ({
      value: p,
      label: policyConfig[p]?.label ?? p,
      count: counts.get(p),
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
      if (policySel.length > 0 && !policySel.includes(u.rentalPolicy)) return false
      if (buildingSel.length > 0 && !(u.building && buildingSel.includes(u.building))) return false
      if (!q) return true
      const hay = `${u.number} ${u.ownerName ?? ""} ${u.ownerEmail ?? ""} ${u.renterName ?? ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [units, search, statusSel, policySel, buildingSel])

  const pageCount = pageCountFor(filtered.length, PAGE_SIZE)
  const safePage = Math.min(page, pageCount)
  const visible = paginate(filtered, safePage, PAGE_SIZE)

  return (
    <div className="space-y-3">
      <ListSearch
        value={search}
        onChange={setSearch}
        placeholder={`Search by ${unitLabel.toLowerCase()} number, owner or renter...`}
      />

      <div className="space-y-2">
        {statusOptions.length > 1 && (
          <ListFilterChips label="Status" options={statusOptions} selected={statusSel} onToggle={toggleFilter("status")} />
        )}
        {policyOptions.length > 1 && (
          <ListFilterChips label="Rental policy" options={policyOptions} selected={policySel} onToggle={toggleFilter("policy")} />
        )}
        {buildingOptions.length > 1 && (
          <ListFilterChips label="Building" options={buildingOptions} selected={buildingSel} onToggle={toggleFilter("building")} />
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">{unitLabel}</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Rental Policy</th>
                <th className="px-4 py-3 text-left">Current Renter</th>
                <th className="px-4 py-3 text-left">Unit Status</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    {units.length === 0
                      ? `No ${unitLabel.toLowerCase()}s yet`
                      : `No ${unitLabel.toLowerCase()}s match your search`}
                  </td>
                </tr>
              )}
              {visible.map((u) => {
                const pc = policyConfig[u.rentalPolicy] ?? policyConfig.NOT_RENTING
                const sc = statusConfig[u.status] ?? { label: u.status, color: "bg-gray-100 text-gray-600" }
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold">
                      {u.number}
                      {u.building && <span className="font-normal text-gray-400 ml-1">Bldg {u.building}</span>}
                      <div className="text-xs text-gray-400 font-normal">
                        {[
                          u.bedrooms && `${u.bedrooms}bd`,
                          u.bathrooms && `${u.bathrooms}ba`,
                          u.sqft && `${u.sqft.toLocaleString()}sqft`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.ownerName || u.ownerEmail ? (
                        <div>
                          <p className="font-medium">{u.ownerName ?? u.ownerEmail}</p>
                          {u.ownerName && u.ownerEmail && <p className="text-xs text-gray-400">{u.ownerEmail}</p>}
                          {u.ownerPhone && <p className="text-xs text-gray-400">{u.ownerPhone}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${pc.dot}`} />
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pc.color}`}>{pc.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.renterName ? (
                        <div>
                          <p className="font-medium">{u.renterName}</p>
                          {u.renterEmail && <p className="text-xs text-gray-400">{u.renterEmail}</p>}
                          {u.renterEndDate && (
                            <p className="text-xs text-gray-400">
                              Until {new Date(u.renterEndDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs break-words">{u.notes ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ListPager page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun={noun} />
    </div>
  )
}
