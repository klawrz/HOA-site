"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Small shared primitives for long, client-filtered lists (units, owners,
// tickets...). Each list keeps its own row markup and its own filter logic;
// these just standardise the search box, the filter chips, and the pager so
// every list at scale looks and behaves the same way.

export function ListSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  )
}

export type ChipOption = { value: string; label: string; count?: number }

export function ListFilterChips({
  label,
  options,
  selected,
  onToggle,
}: {
  label?: string
  options: ChipOption[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  if (options.length === 0) return null
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {label && <span className="text-xs text-gray-400 mr-0.5">{label}</span>}
      {options.map((o) => {
        const active = selected.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            aria-pressed={active}
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
              active
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            )}
          >
            {o.label}
            {o.count != null && (
              <span className={cn("ml-1 tabular-nums", active ? "text-gray-300" : "text-gray-400")}>
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function pageCountFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function ListPager({
  page,
  pageSize,
  total,
  onPageChange,
  noun = "items",
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  noun?: string
}) {
  if (total === 0) return null
  const pageCount = pageCountFor(total, pageSize)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-gray-500 pt-1">
      <span className="tabular-nums">
        Showing {start}&ndash;{end} of {total} {noun}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </Button>
          <span className="px-1 tabular-nums">
            {page} / {pageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
