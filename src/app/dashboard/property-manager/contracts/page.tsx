import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Building2 } from "lucide-react"
import { ContractList } from "@/components/contracts/contract-list"
import { NewContractDialog } from "@/components/contracts/new-contract-dialog"

export default async function PMContractsPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const membership = await db.pMStaffMembership.findFirst({
    where: { userId: session.user.id },
  })

  const contractGrants = membership
    ? await db.pMAccessGrant.findMany({
        where: { membershipId: membership.id, area: "CONTRACTS" },
        include: { org: true },
      })
    : []

  const contractorMemberships = await db.membership.findMany({
    where: { role: "CONTRACTOR" },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  })
  const contractors = contractorMemberships.map((m) => m.user)

  const orgSections = await Promise.all(
    contractGrants.map(async (grant) => ({
      org: grant.org,
      canManage: grant.level === "MANAGE",
      contracts: await db.contract.findMany({
        where: { orgId: grant.orgId, scope: "PROPERTY" },
        include: { contractor: true },
        orderBy: { createdAt: "desc" },
      }),
    }))
  )

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Contracts</h1>
        <p className="text-gray-500 mt-1">
          Property-level contracts for HOAs where you hold a Contracts access grant.
        </p>
      </div>

      {orgSections.map(({ org, canManage, contracts }) => (
        <div key={org.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-sm text-gray-700">{org.name}</h2>
            </div>
            {canManage && (
              <NewContractDialog scope="property" orgId={org.id} contractors={contractors} />
            )}
          </div>
          <ContractList
            contracts={contracts}
            canManage={canManage}
            emptyMessage={`No contracts on file for ${org.name} yet.`}
          />
        </div>
      ))}

      {orgSections.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-400 text-sm">
            You don&apos;t have contract access granted for any HOA yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
