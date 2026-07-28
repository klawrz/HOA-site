import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Building2 } from "lucide-react"

const AREA_LABELS: Record<string, string> = {
  GUESTS: "Guests",
  CLEANING: "Cleaning",
  TICKETS: "Tickets",
}

export default async function UnitManagerDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "UNIT_MANAGER") redirect("/dashboard")

  const assignments = await db.unitManagerAssignment.findMany({
    where: { userId: session.user.id },
    include: { unit: true, grants: true },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Units</h1>
        <p className="text-gray-500 mt-1">Units you've been delegated to help manage</p>
      </div>

      <div className="space-y-3">
        {assignments.map((a) => {
          const canManageTickets = a.grants.some((g) => g.area === "TICKETS" && g.level === "MANAGE")
          return (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  Unit {a.unit.number}
                  {a.unit.building && ` — Building ${a.unit.building}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {a.grants.length === 0 ? (
                    <span className="text-xs text-gray-400">No access granted yet</span>
                  ) : (
                    a.grants.map((g) => (
                      <span
                        key={g.area}
                        className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-800"
                      >
                        {AREA_LABELS[g.area]}: {g.level === "MANAGE" ? "Manage" : "View"}
                      </span>
                    ))
                  )}
                </div>
                {canManageTickets && (
                  <Link
                    href={`/dashboard/unit-manager/tickets/new?unitId=${a.unit.id}`}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    + Submit Ticket for This Unit
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        })}

        {assignments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No units assigned yet. An Owner needs to delegate you from their Unit Profile page.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
