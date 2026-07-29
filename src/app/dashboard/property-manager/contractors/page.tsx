import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ContractorDirectory } from "@/components/contracts/contractor-directory"

export default async function ContractorsDirectoryPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const contractors = await db.user.findMany({
    where: { role: "CONTRACTOR" },
    include: {
      assignedTickets: {
        include: { ticket: { select: { status: true, title: true, id: true } } },
      },
      contracts: { orderBy: { createdAt: "desc" }, take: 2 },
    },
    orderBy: { name: "asc" },
  })

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
