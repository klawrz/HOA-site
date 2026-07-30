import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft, Receipt } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateISO } from "@/lib/utils"

const typeLabel: Record<string, string> = {
  REGULAR_DUES: "Regular Dues",
  SPECIAL: "Special Assessment",
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function chargeStatus(due: number, paid: number) {
  if (paid <= 0) return { label: "Unpaid", color: "bg-red-100 text-red-700" }
  if (paid < due) return { label: "Partial", color: "bg-amber-100 text-amber-700" }
  return { label: "Paid", color: "bg-green-100 text-green-700" }
}

export default async function OwnerDuesPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id, isCurrent: true },
    include: { unit: true },
  })
  const unitIds = ownerships.map((o) => o.unitId)

  const charges = unitIds.length
    ? await db.assessmentCharge.findMany({
        where: { unitId: { in: unitIds }, assessment: { status: "ISSUED" } },
        include: { assessment: true, unit: true },
        orderBy: { assessment: { dueDate: "desc" } },
      })
    : []

  const totalOutstanding = charges.reduce((s, c) => s + Math.max(c.amountDue - c.amountPaid, 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/owner/financial"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Financial
        </Link>
        <h1 className="text-2xl font-bold">Dues & Assessments</h1>
        <p className="text-gray-500 mt-1">Charges issued to your units, and what&apos;s still owed</p>
      </div>

      <Card className="p-4">
        <p className="text-xs text-gray-400">Total outstanding</p>
        <p className="text-2xl font-bold">{money(totalOutstanding)}</p>
      </Card>

      {charges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Receipt className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            No dues or assessments issued yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {charges.map((c) => {
            const status = chargeStatus(c.amountDue, c.amountPaid)
            return (
              <Card key={c.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{c.assessment.title}</p>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                        {typeLabel[c.assessment.type] ?? c.assessment.type}
                      </span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Unit {c.unit.number}
                      {c.unit.building && ` — ${c.unit.building}`} · Due {formatDateISO(c.assessment.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{money(c.amountDue)}</p>
                    {c.amountPaid > 0 && (
                      <p className="text-xs text-green-600">{money(c.amountPaid)} paid</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
