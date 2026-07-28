import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench } from "lucide-react"
import { contractorCategoryLabel } from "@/lib/contractor-styles"

const UNCATEGORIZED = "UNCATEGORIZED"

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

  const grouped = contractors.reduce<Record<string, typeof contractors>>((acc, c) => {
    const key = c.category ?? UNCATEGORIZED
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  const groupOrder = [...Object.keys(contractorCategoryLabel), UNCATEGORIZED].filter(
    (key) => grouped[key]?.length
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contractor Directory</h1>
        <p className="text-gray-500 mt-1">{contractors.length} contractors on file</p>
      </div>

      {groupOrder.map((key) => (
        <div key={key} className="space-y-3">
          <h2 className="font-semibold text-sm text-gray-700">
            {key === UNCATEGORIZED ? "Uncategorized" : contractorCategoryLabel[key]}
          </h2>
          <div className="grid gap-4">
            {grouped[key].map((c) => {
              const activeTickets = c.assignedTickets.filter(
                (a) => a.ticket.status === "OPEN" || a.ticket.status === "IN_PROGRESS"
              )
              return (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <Wrench className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{c.name ?? "Unnamed"}</CardTitle>
                          {c.company && (
                            <p className="text-sm text-gray-500">{c.company}</p>
                          )}
                          <p className="text-xs text-gray-400">{c.email}</p>
                          {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          {activeTickets.length} active ticket{activeTickets.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {c.contracts.length > 0 && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Latest contract: </span>
                        {c.contracts[0].title} —{" "}
                        <span
                          className={
                            c.contracts[0].status === "ACTIVE"
                              ? "text-green-600"
                              : "text-gray-400"
                          }
                        >
                          {c.contracts[0].status}
                        </span>
                      </div>
                    )}
                    {activeTickets.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {activeTickets.slice(0, 3).map((a) => (
                          <span
                            key={a.id}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                          >
                            {a.ticket.title}
                          </span>
                        ))}
                        {activeTickets.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{activeTickets.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {contractors.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Wrench className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            No contractors registered yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
