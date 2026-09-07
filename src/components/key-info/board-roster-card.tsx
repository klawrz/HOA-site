import { Users } from "lucide-react"
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
// PropertyAddressCard above. A tight row of small cards (name / position /
// contact), auto-fitting as many per line as will fit so a board of 3 or
// of 7 both stay compact.
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
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
          >
            {positions.map((p) => (
              <div key={p.id} className="bg-gray-50 rounded-lg px-2.5 py-1.5 text-center leading-tight">
                <p className="text-xs font-semibold truncate">{p.user?.name ?? p.user?.email ?? "Vacant"}</p>
                <p className="text-[10px] text-gray-500">{p.title}</p>
                {p.user?.email && <p className="text-[10px] text-gray-400 truncate">{p.user.email}</p>}
                {p.user?.phone && <p className="text-[10px] text-gray-400 truncate">{p.user.phone}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
