import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddStaffForm } from "./add-staff-form"
import { StaffAccessGrid } from "./staff-access-grid"

export default async function StaffPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const membership = await db.pMStaffMembership.findFirst({
    where: { userId: session.user.id },
    include: { company: true },
  })

  if (!membership) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Create your company profile first before adding staff.
        </CardContent>
      </Card>
    )
  }

  const isAdmin = membership.company.createdById === session.user.id

  const [staff, contracts] = await Promise.all([
    db.pMStaffMembership.findMany({
      where: { companyId: membership.companyId },
      include: { user: true, accessGrants: true },
      orderBy: { createdAt: "asc" },
    }),
    db.pMContract.findMany({
      where: { companyId: membership.companyId, status: "ACTIVE" },
      include: { org: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="text-gray-500 mt-1">{membership.company.legalName}</p>
      </div>

      {isAdmin && <AddStaffForm />}

      <div className="space-y-4">
        {staff.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>
                  {s.user.name ?? s.user.email}
                  {s.userId === membership.company.createdById && (
                    <span className="text-xs font-normal text-gray-400 ml-2">(admin)</span>
                  )}
                </span>
              </CardTitle>
              <p className="text-xs text-gray-400">{s.user.email}</p>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No active HOA contracts yet - access grants apply once this company is contracted by an HOA.
                </p>
              ) : (
                <StaffAccessGrid
                  membershipId={s.id}
                  isSelf={s.userId === session.user.id}
                  isCompanyCreator={s.userId === membership.company.createdById}
                  canEdit={isAdmin}
                  orgs={contracts.map((c) => ({ id: c.org.id, name: c.org.name }))}
                  grants={s.accessGrants.map((g) => ({ orgId: g.orgId, area: g.area, level: g.level }))}
                  canRemove={isAdmin && s.userId !== session.user.id}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
