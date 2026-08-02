import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ContractorDirectory } from "@/components/contracts/contractor-directory"

export default async function AccountContractorsPage() {
  const session = await auth()
  if (!session || session.user.role !== "ACCOUNT_OWNER") redirect("/dashboard")

  const memberships = await db.membership.findMany({
    where: { role: "CONTRACTOR" },
    include: {
      user: {
        include: {
          assignedTickets: {
            include: { ticket: { select: { status: true, title: true, id: true } } },
          },
          contracts: { orderBy: { createdAt: "desc" }, take: 2 },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  })
  const contractors = memberships.map((m) => m.user)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contractor Directory</h1>
        <p className="text-gray-500 mt-1">{contractors.length} contractors on file</p>
      </div>
      <ContractorDirectory contractors={contractors} />
    </div>
  )
}
