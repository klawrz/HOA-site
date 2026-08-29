import { Users, Mail, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Position {
  id: string
  title: string
  termStart: Date
  termEnd: Date | null
  user: { name: string | null; email: string | null; phone: string | null } | null
}

// Read-only summary for Key Information - editing the roster itself stays
// on the Account Owner's dedicated Board page, same split as
// PropertyAddressCard above. Laid out laterally (side by side) per Dara,
// 2026-08-28: name up top, position underneath, contact info underneath
// that - a small roster row rather than a vertical list.
export function BoardRosterCard({ positions }: { positions: Position[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Board Members
        </CardTitle>
      </CardHeader>
      <CardContent>
        {positions.length === 0 && <p className="text-sm text-gray-400">No Board positions on file yet.</p>}
        {positions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {positions.map((p) => (
              <div key={p.id} className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
                <p className="text-sm font-semibold truncate">{p.user?.name ?? p.user?.email ?? "Vacant"}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.title}</p>
                {p.user && (
                  <div className="mt-1.5 space-y-0.5 text-xs text-gray-400">
                    {p.user.email && (
                      <p className="flex items-center justify-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{p.user.email}</span>
                      </p>
                    )}
                    {p.user.phone && (
                      <p className="flex items-center justify-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" /> {p.user.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
