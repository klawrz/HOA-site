import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketRequestForm } from "@/app/dashboard/_components/ticket-request-form"

export default async function NewUnitManagerTicketPage() {
  const session = await auth()
  if (!session || session.user.role !== "UNIT_MANAGER") redirect("/dashboard")

  const assignments = await db.unitManagerAssignment.findMany({
    where: { userId: session.user.id, grants: { some: { area: "TICKETS", level: "MANAGE" } } },
    include: { unit: { include: { org: { select: { unitLabel: true } } } } },
  })

  const units = assignments.map((a) => ({
    id: a.unit.id,
    label: `${a.unit.org.unitLabel} ${a.unit.number}${a.unit.building ? ` — Building ${a.unit.building}` : ""}`,
  }))

  if (units.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          You don&apos;t have ticket management access for any unit yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Submit a Ticket</h1>
        <p className="text-gray-500 mt-1">On behalf of the unit you manage</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketRequestForm units={units} allowCommonArea={false} redirectTo="/dashboard/unit-manager" />
        </CardContent>
      </Card>
    </div>
  )
}
