import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ContractList } from "@/components/contracts/contract-list"

export default async function ContractorContractsPage() {
  const session = await auth()
  if (!session || session.user.role !== "CONTRACTOR") redirect("/dashboard")

  const contracts = await db.contract.findMany({
    where: { contractorId: session.user.id },
    include: { contractor: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Contracts</h1>
        <p className="text-gray-500 mt-1">Contracts you&apos;ve been engaged for.</p>
      </div>
      <ContractList contracts={contracts} canManage={false} />
    </div>
  )
}
