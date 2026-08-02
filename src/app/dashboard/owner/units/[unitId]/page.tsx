import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"
import { UnitContacts } from "./unit-contacts"
import { UnitManagers } from "./unit-managers"
import { UserCog, Phone, Mail } from "lucide-react"
import { ContractList } from "@/components/contracts/contract-list"
import { NewContractDialog } from "@/components/contracts/new-contract-dialog"
import { OccupancyCalendar } from "@/components/occupancy/occupancy-calendar"
import { OccupancyVisibilityForm } from "./occupancy-visibility-form"
import { ShareLinksPanel } from "./share-links-panel"
import { parseSpecialties } from "@/lib/unit-manager-specialties"
import { getUnitLabel, unitDisplayName, unitAddressLines } from "@/lib/unit-label"

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
          contracts: { include: { contractor: true }, orderBy: { createdAt: "desc" } },
          occupancyEntries: { orderBy: { startDate: "asc" } },
          leases: { where: { isActive: true }, include: { renter: true }, take: 1 },
          occupancyShareLinks: { where: { revokedAt: null }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  })

  if (!ownership) notFound()

  const { unit } = ownership
  const activeLease = unit.leases[0]

  const [contractorMemberships, org, unitLabel] = await Promise.all([
    db.membership.findMany({
      where: { role: "CONTRACTOR" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    getUnitLabel(session.user.orgId),
  ])
  const contractors = contractorMemberships.map((m) => m.user)
  const unitName = unitDisplayName(unitLabel, unit.number, unit.building)

  // A shared directory, same as the Contractor directory below - anyone who
  // has ever become a Unit Manager (via invite or assignment elsewhere) and
  // opted into directoryVisible is visible here so other Owners can pick
  // them instead of typing an email blind.
  const unitManagerMemberships = await db.membership.findMany({
    where: { role: "UNIT_MANAGER", user: { directoryVisible: true } },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  })
  const unitManagerDirectory = unitManagerMemberships.map((m) => m.user)

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{unitName}</h1>
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
            {unit.managers.map((m) => {
              const name = m.user?.name ?? m.name
              const phone = m.user?.phone ?? m.phone
              const email = m.user?.email ?? m.email
              return (
                <div key={m.id}>
                  <p className="font-semibold text-teal-900">{name ?? email}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-teal-800">
                    {phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {phone}
                      </span>
                    )}
                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {email}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
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
          {(() => {
            const { unitName: name, propertyLines } = unitAddressLines(org ?? {
              addressLine1: null, addressLine2: null, city: null, state: null, postalCode: null, country: null,
            }, unitName)
            return (
              <div>
                <p className="font-medium text-gray-700">{name}</p>
                {propertyLines.length > 0 ? (
                  propertyLines.map((line, i) => <p key={i}>{line}</p>)
                ) : (
                  <p className="text-gray-400">
                    Property address not on file - the Account Owner can add one from the dashboard.
                  </p>
                )}
              </div>
            )
          })()}
          {unit.civicRoll && (
            <p className="text-xs text-gray-400 pt-1">Civic Roll Number: {unit.civicRoll}</p>
          )}
        </CardContent>
      </Card>

      <Card id="occupancy-calendar">
        <CardHeader>
          <CardTitle className="text-base">Occupancy Calendar</CardTitle>
          <p className="text-xs text-gray-400">
            Log who&apos;s staying and when - your own family, a trusted guest, a renter, or vacant.
          </p>
        </CardHeader>
        <CardContent>
          <OccupancyCalendar
            unitId={unit.id}
            entries={unit.occupancyEntries}
            canManage
            activeLease={
              activeLease
                ? { renterName: activeLease.renter.name, startDate: activeLease.startDate, endDate: activeLease.endDate }
                : null
            }
          />
        </CardContent>
      </Card>

      <OccupancyVisibilityForm
        ownershipId={ownership.id}
        visibleToBoard={ownership.occupancyVisibleToBoard}
        visibleToPM={ownership.occupancyVisibleToPM}
        poolMember={ownership.rentalPoolMember}
        occupancyPolicy={org?.occupancyVisibilityPolicy ?? null}
        poolGuidelines={org?.rentalPoolGuidelines ?? null}
      />

      <ShareLinksPanel
        unitId={unit.id}
        links={unit.occupancyShareLinks.map((l) => ({ id: l.id, token: l.token, label: l.label }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitContacts unitId={unit.id} contacts={unit.contacts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit Manager</CardTitle>
          <p className="text-xs text-gray-400">
            Delegate guests, cleaning, tickets, or occupancy access. You control what they can do.
          </p>
        </CardHeader>
        <CardContent>
          <UnitManagers
            unitId={unit.id}
            managers={unit.managers.map((m) => ({
              id: m.id,
              name: m.user?.name ?? m.name,
              email: m.user?.email ?? m.email,
              phone: m.user?.phone ?? m.phone,
              notes: m.notes,
              hasAccount: !!m.user,
              grants: m.grants.map((g) => ({ area: g.area, level: g.level })),
            }))}
            directory={unitManagerDirectory
              .filter((u) => !unit.managers.some((m) => m.user?.email === u.email))
              .map((u) => ({
                name: u.name,
                email: u.email,
                company: u.company,
                headline: u.headline,
                bio: u.bio,
                phone: u.phone,
                yearsExperience: u.yearsExperience,
                specialties: parseSpecialties(u.specialties),
              }))}
            selfManaged={unit.selfManaged}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="text-base">Contracts</CardTitle>
          <NewContractDialog scope="unit" unitId={unit.id} contractors={contractors} />
        </CardHeader>
        <CardContent>
          <ContractList contracts={unit.contracts} canManage />
        </CardContent>
      </Card>
    </div>
  )
}
