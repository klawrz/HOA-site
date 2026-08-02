import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ContractList } from "@/components/contracts/contract-list"
import { NewContractDialog } from "@/components/contracts/new-contract-dialog"

export default async function OwnerContractsPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const [ownerships, contractorMemberships] = await Promise.all([
    db.unitOwnership.findMany({
      where: { ownerId: session.user.id, isCurrent: true },
      include: {
        unit: {
          include: { contracts: { include: { contractor: true }, orderBy: { createdAt: "desc" } } },
        },
      },
    }),
    db.membership.findMany({ where: { role: "CONTRACTOR" }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ])
  const contractors = contractorMemberships.map((m) => m.user)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contracts</h1>
        <p className="text-gray-500 mt-1">Service contracts across your units - cleaning, internet, and the like</p>
      </div>

      {ownerships.map((o) => (
        <div key={o.unit.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">
              Unit {o.unit.number}
              {o.unit.building && ` — Building ${o.unit.building}`}
            </h2>
            <NewContractDialog scope="unit" unitId={o.unit.id} contractors={contractors} />
          </div>
          <ContractList contracts={o.unit.contracts} canManage />
        </div>
      ))}

      {ownerships.length === 0 && (
        <p className="text-sm text-gray-500">No units assigned yet.</p>
      )}
    </div>
  )
}
