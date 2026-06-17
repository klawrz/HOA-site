import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { NewContractDialog } from "./new-contract-dialog"

export default async function ContractsPage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const contracts = await db.contract.findMany({
    include: { contractor: true },
    orderBy: { createdAt: "desc" },
  })

  const totalValue = contracts
    .filter((c) => c.status === "ACTIVE" && c.amount)
    .reduce((s, c) => s + (c.amount ?? 0), 0)

  const contractors = await db.user.findMany({
    where: { role: "CONTRACTOR" },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-gray-500 mt-1">
            {contracts.length} contracts · ${totalValue.toLocaleString()} active value
          </p>
        </div>
        <NewContractDialog contractors={contractors} />
      </div>

      <div className="space-y-3">
        {contracts.map((c) => (
          <Card key={c.id}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-gray-500">
                      {c.contractor.name ?? c.contractor.email}
                      {c.contractor.company && ` · ${c.contractor.company}`}
                    </p>
                    {c.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(c.startDate).toLocaleDateString()}
                      {c.endDate && ` – ${new Date(c.endDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {c.amount && (
                    <p className="font-semibold">${c.amount.toLocaleString()}</p>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : c.status === "EXPIRED"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {contracts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No contracts on file yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
