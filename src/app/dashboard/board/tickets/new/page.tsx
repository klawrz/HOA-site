import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketRequestForm } from "@/app/dashboard/_components/ticket-request-form"
import { getUnitLabel, unitDisplayName, compareUnitNumbers } from "@/lib/unit-label"

export default async function NewBoardTicketPage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const [allUnits, unitLabel] = await Promise.all([
    db.unit.findMany({
      where: { orgId: session.user.orgId ?? undefined },
    }),
    getUnitLabel(session.user.orgId),
  ])
  allUnits.sort(compareUnitNumbers)

  const units = allUnits.map((u) => ({
    id: u.id,
    label: unitDisplayName(unitLabel, u.number, u.building),
  }))

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Submit a Request</h1>
        <p className="text-gray-500 mt-1">Report a common property concern, or a request on behalf of a unit</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketRequestForm units={units} allowCommonArea redirectTo="/dashboard/board/tickets" />
        </CardContent>
      </Card>
    </div>
  )
}
