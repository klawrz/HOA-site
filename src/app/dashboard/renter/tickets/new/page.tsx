import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { NewTicketForm } from "./new-ticket-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUnitLabel } from "@/lib/unit-label"

export default async function NewTicketPage() {
  const session = await auth()
  if (!session || session.user.role !== "RENTER") redirect("/dashboard")

  const [lease, unitLabel] = await Promise.all([
    db.lease.findFirst({
      where: { renterId: session.user.id, isActive: true },
      include: { unit: true },
    }),
    getUnitLabel(session.user.orgId),
  ])

  if (!lease) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">
          You need an active lease to submit a trouble ticket.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Submit a Trouble Ticket</h1>
        <p className="text-gray-500 mt-1">Report a maintenance issue for {unitLabel} {lease.unit.number}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewTicketForm unitId={lease.unit.id} unitNumber={lease.unit.number} />
        </CardContent>
      </Card>
    </div>
  )
}
