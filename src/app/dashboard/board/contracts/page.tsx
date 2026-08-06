import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ContractList } from "@/components/contracts/contract-list"
import { NewContractDialog } from "@/components/contracts/new-contract-dialog"

export default async function ContractsPage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER" || !session.user.orgId) redirect("/dashboard")

  const contracts = await db.contract.findMany({
    where: { orgId: session.user.orgId, scope: "PROPERTY" },
    include: { contractor: true },
    orderBy: { createdAt: "desc" },
  })

  const contractorMemberships = await db.membership.findMany({
    where: { orgId: session.user.orgId, role: "CONTRACTOR" },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  })
  const contractors = contractorMemberships.map((m) => m.user)

  const totalValue = contracts
    .filter((c) => c.status === "ACTIVE" && c.amount)
    .reduce((s, c) => s + (c.amount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-gray-500 mt-1">
            {contracts.length} contracts · ${totalValue.toLocaleString()} active value
          </p>
        </div>
        <NewContractDialog scope="property" orgId={session.user.orgId} contractors={contractors} />
      </div>
      <ContractList contracts={contracts} canManage />
    </div>
  )
}
