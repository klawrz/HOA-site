import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketRequestForm } from "@/app/dashboard/_components/ticket-request-form"

export default async function NewPropertyManagerTicketPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const allUnits = await db.unit.findMany({
    where: { orgId: session.user.orgId ?? undefined },
    orderBy: { number: "asc" },
  })

  const units = allUnits.map((u) => ({
    id: u.id,
    label: `Unit ${u.number}${u.building ? ` — Building ${u.building}` : ""}`,
  }))

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Submit a Request</h1>
        <p className="text-gray-500 mt-1">Log a request for any unit, or a common property concern</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketRequestForm units={units} allowCommonArea redirectTo="/dashboard/property-manager/tickets" />
        </CardContent>
      </Card>
    </div>
  )
}
