"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Building2, ChevronRight } from "lucide-react"
import { TransferOwnershipDialog } from "@/components/units/transfer-ownership-dialog"
import { CancelTransferButton } from "@/components/units/cancel-transfer-button"
import {
  ListSearch,
  ListFilterChips,
  ListPager,
  paginate,
  pageCountFor,
  type ChipOption,
} from "@/components/ui/list-controls"

const PAGE_SIZE = 25

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  OWNER_OCCUPIED: "bg-blue-100 text-blue-700",
  RENTED: "bg-yellow-100 text-yellow-700",
  UNAVAILABLE: "bg-gray-100 text-gray-500",
}

// Fixed display order for the status chips; only statuses actually present
// in the data get a chip.
const STATUS_ORDER = ["OWNER_OCCUPIED", "RENTED", "AVAILABLE", "UNAVAILABLE"] as const

const statusLabel = (s: string) => s.replace(/_/g, " ")

export type BoardUnitRow = {
  id: string
  number: string
  display: string
  building: string | null
  bedrooms: number | null
  bathrooms: number | null
  status: string
  ownerNames: string
  earliestSince: string | null
  managerName: string | null
  pending: {
    id: string
    newOwnerName: string
    sellerSummary: string
    buyerConfirmed: boolean
  } | null
}

export function BoardUnitsList({
  units,
  unitLabel,
}: {
  units: BoardUnitRow[]
  unitLabel: string
}) {
  const [search, setSearch] = useState("")
  const [statusSel, setStatusSel] = useState<string[]>([])
  const [buildingSel, setBuildingSel] = useState<string[]>([])
  const [page, setPage] = useState(1)

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
      return (
        u.display.toLowerCase().includes(q) ||
        u.number.toLowerCase().includes(q) ||
        u.ownerNames.toLowerCase().includes(q)
      )
    })
  }, [units, search, statusSel, buildingSel])

  // Reset to the first page whenever the query changes - adjusting state
  // during render rather than in an effect (see react.dev, "You Might Not
  // Need an Effect").
  const queryKey = `${search}|${statusSel.join(",")}|${buildingSel.join(",")}`
  const [prevQueryKey, setPrevQueryKey] = useState(queryKey)
  if (queryKey !== prevQueryKey) {
    setPrevQueryKey(queryKey)
    setPage(1)
  }

  const pageCount = pageCountFor(filtered.length, PAGE_SIZE)
  const safePage = Math.min(page, pageCount)
  const visible = paginate(filtered, safePage, PAGE_SIZE)

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  return (
    <div className="space-y-3">
      <ListSearch
        value={search}
        onChange={setSearch}
        placeholder={`Search by ${unitLabel.toLowerCase()} number or owner name...`}
      />

      {(statusOptions.length > 1 || buildingOptions.length > 1) && (
        <div className="space-y-2">
          {statusOptions.length > 1 && (
            <ListFilterChips
              label="Status"
              options={statusOptions}
              selected={statusSel}
              onToggle={toggle(setStatusSel)}
            />
          )}
          {buildingOptions.length > 1 && (
            <ListFilterChips
              label="Building"
              options={buildingOptions}
              selected={buildingSel}
              onToggle={toggle(setBuildingSel)}
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
          <div key={u.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/dashboard/board/units/${u.id}`}
                className="flex flex-1 items-center justify-between gap-4 min-w-0 group"
              >
                <div className="min-w-0">
                  <p className="font-medium group-hover:underline">{u.display}</p>
                  <p className="text-xs text-gray-400">
                    {[u.building, u.bedrooms && `${u.bedrooms}bd`, u.bathrooms && `${u.bathrooms}ba`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[u.status] ?? "bg-gray-100 text-gray-500"}`}
                  >
                    {statusLabel(u.status)}
                  </span>
                  <div className="text-right text-xs">
                    {u.ownerNames && <p className="text-gray-600">{u.ownerNames}</p>}
                    {u.earliestSince && (
                      <p className="text-gray-400">
                        Since {new Date(u.earliestSince).toLocaleDateString()}
                      </p>
                    )}
                    {u.managerName && <p className="text-gray-400">UM: {u.managerName}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              </Link>
              {!u.pending && (
                <TransferOwnershipDialog
                  unitId={u.id}
                  unitDisplay={u.display}
                  currentOwnerName={u.ownerNames || null}
                />
              )}
            </div>
            {u.pending && (
              <div className="mt-3 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                <div className="text-amber-800">
                  <p className="font-medium">
                    Transfer to {u.pending.newOwnerName} pending confirmation
                  </p>
                  <p className="text-amber-700">
                    Sellers: {u.pending.sellerSummary}
                    {" · "}
                    Buyer: {u.pending.buyerConfirmed ? "✓ confirmed" : "waiting"}
                  </p>
                </div>
                <CancelTransferButton requestId={u.pending.id} />
              </div>
            )}
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
