import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn, formatDateTime } from "@/lib/utils"
import { priorityColor, statusColor, scopeLabel } from "@/lib/ticket-styles"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"

export default async function OwnerTicketsPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id },
    select: { unitId: true },
  })
  const ownedUnitIds = ownerships.map((o) => o.unitId)

  const [tickets, unitLabel] = await Promise.all([
    db.troubleTicket.findMany({
      where: {
        OR: [{ unitId: { in: ownedUnitIds } }, { scope: "COMMON_AREA" }],
      },
      include: { unit: true, submittedBy: true },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    }),
    getUnitLabel(session.user.orgId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trouble Tickets</h1>
          <p className="text-gray-500 mt-1">
            Requests for your units, plus common property requests
          </p>
        </div>
        <Link href="/dashboard/owner/tickets/new" className={cn(buttonVariants())}>
          New Request
        </Link>
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
          <Card key={t.id}>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[t.priority]}`}>
                  {t.priority}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.status]}`}>
                  {t.status.replace("_", " ")}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                  {t.unit ? unitDisplayName(unitLabel, t.unit.number, t.unit.building) : scopeLabel[t.scope]}
                </span>
              </div>
              <p className="font-semibold">{t.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>
              <p className="text-xs text-gray-400 mt-2">
                Submitted by {t.submittedBy.name ?? t.submittedBy.email} on {formatDateTime(t.createdAt)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tickets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No tickets yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
