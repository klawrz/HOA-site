import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketRequestForm } from "@/app/dashboard/_components/ticket-request-form"

export default async function NewOwnerTicketPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id },
    include: { unit: true },
  })

  const units = ownerships.map((o) => ({
    id: o.unit.id,
    label: `Unit ${o.unit.number}${o.unit.building ? ` — Building ${o.unit.building}` : ""}`,
  }))

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Submit a Request</h1>
        <p className="text-gray-500 mt-1">Report an issue with one of your units, or a common property concern</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketRequestForm units={units} allowCommonArea redirectTo="/dashboard/owner/tickets" />
        </CardContent>
      </Card>
    </div>
  )
}
