import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"
import { UnitContacts } from "./unit-contacts"
import { UnitManagers } from "./unit-managers"
import { UserCog, Phone, Mail } from "lucide-react"

function addressLines(u: {
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}) {
  const line2 = [u.city, u.state, u.postalCode].filter(Boolean).join(", ")
  return [u.addressLine1, u.addressLine2, line2, u.country].filter(Boolean)
}

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>
}) {
  const { unitId } = await params
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const ownership = await db.unitOwnership.findFirst({
    where: { unitId, ownerId: session.user.id, isCurrent: true },
    include: {
      unit: {
        include: {
          contacts: true,
          managers: { include: { user: true, grants: true } },
        },
      },
    },
  })

  if (!ownership) notFound()

  const { unit } = ownership

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          Unit {unit.number}
          {unit.building && ` — Building ${unit.building}`}
        </h1>
        <p className="text-gray-500 mt-1">
          Owned since {formatDateTime(ownership.since)}
        </p>
      </div>

      {unit.managers.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5 mb-2">
            <UserCog className="h-3.5 w-3.5" /> Unit Manager
          </p>
          <div className="space-y-2">
            {unit.managers.map((m) => (
              <div key={m.id}>
                <p className="font-semibold text-teal-900">{m.user.name ?? m.user.email}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-teal-800">
                  {m.user.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {m.user.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {m.user.email}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex gap-4 text-gray-500">
            {unit.bedrooms && <span>{unit.bedrooms} bed</span>}
            {unit.bathrooms && <span>{unit.bathrooms} bath</span>}
            {unit.sqft && <span>{unit.sqft.toLocaleString()} sqft</span>}
          </div>
          {addressLines(unit).length > 0 ? (
            addressLines(unit).map((line, i) => <p key={i}>{line}</p>)
          ) : (
            <p className="text-gray-400">No address on file - contact your Property Manager to add one.</p>
          )}
          {unit.civicRoll && (
            <p className="text-xs text-gray-400 pt-1">Civic Roll Number: {unit.civicRoll}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts</CardTitle>
          <p className="text-xs text-gray-400">
            A prime contact and up to 2 emergency contacts for this unit.
          </p>
        </CardHeader>
        <CardContent>
          <UnitContacts unitId={unit.id} contacts={unit.contacts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit Manager</CardTitle>
          <p className="text-xs text-gray-400">
            Delegate someone to handle guests, cleaning, or maintenance tickets for this unit.
            You control exactly what they can do.
          </p>
        </CardHeader>
        <CardContent>
          <UnitManagers
            unitId={unit.id}
            managers={unit.managers.map((m) => ({
              id: m.id,
              name: m.user.name,
              email: m.user.email,
              grants: m.grants.map((g) => ({ area: g.area, level: g.level })),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
