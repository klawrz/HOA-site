import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench, FileText } from "lucide-react"
import { contractorCategoryLabel } from "@/lib/contractor-styles"
import { NewContractDialog } from "@/components/contracts/new-contract-dialog"

const UNCATEGORIZED = "UNCATEGORIZED"

type ContractorRow = {
  id: string
  name: string | null
  email: string | null
  company: string | null
  phone: string | null
  category: string | null
  assignedTickets: { id: string; ticket: { status: string; title: string; id: string } }[]
  contracts: { title: string; status: string; fileUrl: string | null }[]
}

export function ContractorDirectory({
  contractors,
  orgId,
}: {
  contractors: ContractorRow[]
  // Optional - only the PM's directory (2026-08-14) passes this to get the
  // "+ Add Contract" shortcut per card. Account/Board's directories stay
  // read-only as before, unaffected by this omitting it.
  orgId?: string
}) {
  const grouped = contractors.reduce<Record<string, ContractorRow[]>>((acc, c) => {
    const key = c.category ?? UNCATEGORIZED
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  const groupOrder = [...Object.keys(contractorCategoryLabel), UNCATEGORIZED].filter(
    (key) => grouped[key]?.length
  )

  if (contractors.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Wrench className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          No contractors registered yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {groupOrder.map((key) => (
        <div key={key} className="space-y-3">
          <h2 className="font-semibold text-sm text-gray-700">
            {key === UNCATEGORIZED ? "Uncategorized" : contractorCategoryLabel[key]}
          </h2>
          <div className="grid gap-4">
            {grouped[key].map((c) => {
              const activeTickets = c.assignedTickets.filter(
                (a) => a.ticket.status !== "CLOSED"
              )
              // Prefer a genuinely ACTIVE contract over just the most recent
              // one - a lapsed/ended contract sorting newest-first would
              // otherwise hide an older still-active one from view.
              const activeContract = c.contracts.find((ct) => ct.status === "ACTIVE") ?? c.contracts[0]
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
                          {c.company && <p className="text-sm text-gray-500">{c.company}</p>}
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
                  <CardContent className="space-y-2">
                    {activeContract ? (
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">
                          {activeContract.status === "ACTIVE" ? "Active contract: " : "Latest contract: "}
                        </span>
                        {activeContract.title} —{" "}
                        <span className={activeContract.status === "ACTIVE" ? "text-green-600" : "text-gray-400"}>
                          {activeContract.status}
                        </span>
                        {activeContract.fileUrl && (
                          <a
                            href={activeContract.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <FileText className="h-3 w-3" /> View document
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No contract on file</p>
                    )}
                    {activeTickets.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {activeTickets.slice(0, 3).map((a) => (
                          <span key={a.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {a.ticket.title}
                          </span>
                        ))}
                        {activeTickets.length > 3 && (
                          <span className="text-xs text-gray-400">+{activeTickets.length - 3} more</span>
                        )}
                      </div>
                    )}
                    {orgId && (
                      <div>
                        <NewContractDialog
                          scope="property"
                          orgId={orgId}
                          contractors={contractors}
                          defaultContractorId={c.id}
                          triggerLabel="+ Add Contract"
                          triggerVariant="outline"
                          triggerSize="sm"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
