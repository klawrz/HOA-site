import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RentalPolicyForm } from "../rental-policy-form"

export default async function OwnerRentalSettingsPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id, isCurrent: true },
    include: { unit: true },
    orderBy: { unit: { number: "asc" } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rental Settings</h1>
        <p className="text-gray-500 mt-1">Who can rent each of your units, and notes for your property manager</p>
      </div>

      {ownerships.map((o) => (
        <Card key={o.unit.id}>
          <CardHeader>
            <CardTitle className="text-base">
              Unit {o.unit.number}
              {o.unit.building && ` — Building ${o.unit.building}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RentalPolicyForm
              ownershipId={o.id}
              unitId={o.unit.id}
              currentPolicy={o.rentalPolicy}
              currentNotes={o.notes ?? ""}
            />
          </CardContent>
        </Card>
      ))}

      {ownerships.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No units assigned yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
