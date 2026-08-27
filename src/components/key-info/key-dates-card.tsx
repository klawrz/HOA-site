import Link from "next/link"
import { CalendarDays, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateISO } from "@/lib/utils"
import type { KeyDateEntry } from "@/lib/key-dates"

// Reusable across roles (Board/PM/Owner all render this, right below the
// Board roster) - per Dara 2026-08-27. Deliberately just a link list, not
// its own edit surface - AGM details are edited on the AGM page itself.
export function KeyDatesCard({ dates }: { dates: KeyDateEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Key Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {dates.length === 0 && <p className="text-sm text-gray-400">Nothing scheduled yet.</p>}
        {dates.map((d, i) => (
          <Link
            key={i}
            href={d.href}
            className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors"
          >
            <span className="text-sm font-medium">{d.label}</span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              {formatDateISO(d.date)}
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
