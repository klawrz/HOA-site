import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays } from "lucide-react"
import { OccupancyCalendar } from "@/components/occupancy/occupancy-calendar"

// Public, unauthenticated - the unguessable token is the sole credential,
// same shape as the Invite-accept flow. Scoped to exactly one unit's
// occupancy, nothing else - no other unit, owner, or financial data is
// ever reachable from here.
export default async function SharedOccupancyPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const link = await db.occupancyShareLink.findUnique({
    where: { token },
    include: {
      unit: {
        include: {
          org: { select: { unitLabel: true } },
          occupancyEntries: { orderBy: { startDate: "asc" } },
          leases: { where: { isActive: true }, include: { renter: true }, take: 1 },
        },
      },
    },
  })

  if (!link || link.revokedAt) notFound()

  const { unit } = link
  const activeLease = unit.leases[0]

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
      <div className="w-full max-w-lg space-y-4 mt-8">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {unit.org.unitLabel} {unit.number}
            {unit.building && ` — Building ${unit.building}`}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Shared with {link.label} - occupancy calendar, read-only.</p>
        </div>
        <Card>
          <CardContent className="pt-4">
            <OccupancyCalendar
              unitId={unit.id}
              entries={unit.occupancyEntries}
              canManage={false}
              activeLease={
                activeLease
                  ? { renterName: activeLease.renter.name, startDate: activeLease.startDate, endDate: activeLease.endDate }
                  : null
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
