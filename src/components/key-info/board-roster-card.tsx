import { Users, Mail, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateISO } from "@/lib/utils"

interface Position {
  id: string
  title: string
  termStart: Date
  termEnd: Date | null
  user: { name: string | null; email: string; phone: string | null } | null
}

// Read-only summary for Key Information - editing the roster itself stays
// on the Account Owner's dedicated Board page, same split as
// PropertyAddressCard above.
export function BoardRosterCard({ positions }: { positions: Position[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Board Members
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {positions.length === 0 && <p className="text-sm text-gray-400">No Board positions on file yet.</p>}
        {positions.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-1.5">
            <p className="text-sm font-medium truncate">
              <span className="shrink-0">{p.title}</span>
              <span className="text-gray-400 font-normal"> — {p.user?.name ?? p.user?.email ?? "Vacant"}</span>
            </p>
            {p.user && (
              <div className="flex gap-3 text-xs text-gray-500 shrink-0">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {p.user.email}
                </span>
                {p.user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {p.user.phone}
                  </span>
                )}
                <span className="text-gray-300" title={`${formatDateISO(p.termStart)}${p.termEnd ? ` – ${formatDateISO(p.termEnd)}` : " – present"}`}>
                  {p.termEnd ? formatDateISO(p.termEnd) : "present"}
                </span>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
