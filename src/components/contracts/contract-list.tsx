"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, AlertTriangle } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import {
  contractTypeLabel,
  contractTypeColor,
  contractStatusColor,
  billingPeriodLabel,
  getExpiryStatus,
  expiryStatusConfig,
} from "@/lib/contract-styles"
import { updateContractStatus } from "@/app/actions/contracts"

type ContractRow = {
  id: string
  title: string
  type: string
  status: string
  startDate: Date
  endDate: Date | null
  reminderDaysBefore: number
  amount: number | null
  billingPeriod: string | null
  description: string | null
  fileUrl: string | null
  contractor: { name: string | null; email: string; company: string | null }
}

export function ContractList({
  contracts,
  canManage,
  emptyMessage = "No contracts on file yet.",
}: {
  contracts: ContractRow[]
  canManage: boolean
  emptyMessage?: string
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id)
    const result = await updateContractStatus(id, status)
    setUpdatingId(null)
    if (!result.success) toast.error("Failed to update contract")
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          {emptyMessage}
        </CardContent>
      </Card>
    )
  }

  // Critical contracts (insurance, government/regulatory) surface first.
  const sorted = [...contracts].sort((a, b) => {
    if (a.type === "CRITICAL" && b.type !== "CRITICAL") return -1
    if (b.type === "CRITICAL" && a.type !== "CRITICAL") return 1
    return 0
  })

  return (
    <div className="space-y-2">
      {sorted.map((c) => {
        const isCritical = c.type === "CRITICAL"
        const expiry = getExpiryStatus(c.endDate, c.reminderDaysBefore)
        const expiryCfg = expiryStatusConfig[expiry]
        return (
          <Card key={c.id} className={isCritical ? "border-red-300 ring-1 ring-red-100" : ""}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {isCritical ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{c.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contractTypeColor[c.type]}`}>
                        {contractTypeLabel[c.type]}
                      </span>
                      {isCritical && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expiryCfg.color}`}>
                          {expiryCfg.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {c.contractor.name ?? c.contractor.email}
                      {c.contractor.company && ` · ${c.contractor.company}`}
                    </p>
                    {c.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(c.startDate)}
                      {c.endDate && ` – ${formatDateTime(c.endDate)}`}
                    </p>
                    {c.fileUrl && (
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View file
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  {c.amount && (
                    <p className="font-semibold">
                      ${c.amount.toLocaleString()}
                      {c.billingPeriod && (
                        <span className="text-xs font-normal text-gray-400">
                          {" "}
                          / {billingPeriodLabel[c.billingPeriod]}
                        </span>
                      )}
                    </p>
                  )}
                  {canManage ? (
                    <select
                      value={c.status}
                      disabled={updatingId === c.id}
                      onChange={(e) => handleStatusChange(c.id, e.target.value)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 ${contractStatusColor[c.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="TERMINATED">TERMINATED</option>
                    </select>
                  ) : (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${contractStatusColor[c.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {c.status}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
