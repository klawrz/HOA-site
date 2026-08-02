"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RecordPaymentDialog } from "./record-payment-dialog"
import { deleteAssessment, issueAssessment } from "@/app/actions/assessments"
import { formatDateISO } from "@/lib/utils"
import { PaymentMethod } from "@/generated/prisma"

interface ChargeRow {
  id: string
  unitNumber: string
  unitBuilding: string | null
  ownerName: string | null
  amountDue: number
  amountPaid: number
  paymentMethod: PaymentMethod | null
  paidAt: Date | null
}

interface AssessmentData {
  id: string
  title: string
  type: string
  status: string
  totalAmount: number
  dueDate: Date
  notes: string | null
  budgetLabel: string | null
  charges: ChargeRow[]
}

const typeLabel: Record<string, string> = {
  REGULAR_DUES: "Regular Dues",
  SPECIAL: "Special Assessment",
}

const methodLabel: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  CARD: "Card",
  OTHER: "Other",
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function chargeStatus(due: number, paid: number) {
  if (paid <= 0) return { label: "Unpaid", color: "bg-red-100 text-red-700" }
  if (paid < due) return { label: "Partial", color: "bg-amber-100 text-amber-700" }
  return { label: "Paid", color: "bg-green-100 text-green-700" }
}

export function AssessmentEditor({
  assessment,
  canManage,
  canIssue,
  onDeletedHref,
  unitLabel,
}: {
  assessment: AssessmentData
  canManage: boolean
  canIssue: boolean
  onDeletedHref?: string
  unitLabel: string
}) {
  const [issuing, setIssuing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const totalCollected = assessment.charges.reduce((s, c) => s + c.amountPaid, 0)
  const paidCount = assessment.charges.filter((c) => c.amountPaid >= c.amountDue && c.amountDue > 0).length
  const percentCollected = assessment.totalAmount > 0 ? (totalCollected / assessment.totalAmount) * 100 : 0

  async function handleIssue() {
    setIssuing(true)
    const result = await issueAssessment(assessment.id)
    setIssuing(false)
    if (!result.success) toast.error("Failed to issue assessment")
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteAssessment(assessment.id)
    setDeleting(false)
    if (result.success && onDeletedHref) {
      window.location.href = onDeletedHref
    } else if (!result.success) {
      toast.error(result.error || "Failed to delete assessment")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{assessment.title}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
              {typeLabel[assessment.type] ?? assessment.type}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                assessment.status === "ISSUED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {assessment.status === "ISSUED" ? "Issued" : "Draft"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Due {formatDateISO(assessment.dueDate)}
            {assessment.budgetLabel && ` · linked to ${assessment.budgetLabel}`}
          </p>
          {assessment.notes && <p className="text-sm text-gray-600 mt-1">{assessment.notes}</p>}
        </div>
        <div className="flex gap-2">
          {assessment.status === "DRAFT" && canIssue && (
            <Button size="sm" onClick={handleIssue} disabled={issuing} className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> {issuing ? "Issuing..." : "Issue to Owners"}
            </Button>
          )}
          {assessment.status === "DRAFT" && canManage && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-gray-400">Total Assessed</p>
          <p className="text-lg font-semibold">{money(assessment.totalAmount)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-400">Collected</p>
          <p className="text-lg font-semibold text-green-700">
            {money(totalCollected)} <span className="text-xs text-gray-400">({percentCollected.toFixed(0)}%)</span>
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-400">Units Paid in Full</p>
          <p className="text-lg font-semibold">
            {paidCount} / {assessment.charges.length}
          </p>
        </Card>
      </div>

      <Card className="py-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="text-left font-medium px-3 py-2">{unitLabel}</th>
                <th className="text-left font-medium px-3 py-2">Owner</th>
                <th className="text-right font-medium px-3 py-2">Due</th>
                <th className="text-right font-medium px-3 py-2">Paid</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Method</th>
                {canManage && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {assessment.charges.map((c) => {
                const status = chargeStatus(c.amountDue, c.amountPaid)
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-medium">
                      {unitLabel} {c.unitNumber}
                      {c.unitBuilding && ` — ${c.unitBuilding}`}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{c.ownerName ?? "—"}</td>
                    <td className="text-right px-3 py-2 tabular-nums">{money(c.amountDue)}</td>
                    <td className="text-right px-3 py-2 tabular-nums">{money(c.amountPaid)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {c.paymentMethod ? methodLabel[c.paymentMethod] : "—"}
                      {c.paidAt && ` · ${formatDateISO(c.paidAt)}`}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2">
                        <RecordPaymentDialog
                          chargeId={c.id}
                          unitLabel={`${unitLabel} ${c.unitNumber}`}
                          amountDue={c.amountDue}
                          amountPaid={c.amountPaid}
                          paymentMethod={c.paymentMethod}
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
