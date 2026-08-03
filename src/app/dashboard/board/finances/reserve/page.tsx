import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReserveFundSummary } from "@/components/reserve-fund/reserve-fund-summary"
import { ReserveTransactionDialog } from "@/components/reserve-fund/reserve-transaction-dialog"
import { ReserveDetailsDialog } from "@/components/reserve-fund/reserve-details-dialog"
import { ReserveYearTable } from "@/components/reserve-fund/reserve-year-table"
import { TransactionList } from "@/components/reserve-fund/transaction-list"
import { reserveYearRange, computeReserveYearRows } from "@/lib/reserve-fund"

export default async function BoardReservePage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const [org, transactions, yearNotes] = await Promise.all([
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    db.reserveTransaction.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { createdBy: true },
      orderBy: { date: "desc" },
    }),
    db.reserveYearNote.findMany({ where: { orgId: session.user.orgId ?? undefined } }),
  ])

  const balance = transactions.reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0)
  const yearRows = computeReserveYearRows(transactions, reserveYearRange())
  const comments = Object.fromEntries(yearNotes.map((n) => [n.year, n.comment]))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/board/finances"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Finances
        </Link>
        <h1 className="text-2xl font-bold">Reserve Fund</h1>
        <p className="text-gray-500 mt-1">Always-current balance, separate from operating funds</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Reserve Fund</CardTitle>
          <div className="flex gap-2">
            <ReserveDetailsDialog
              currentTarget={org?.reserveTarget ?? null}
              currentPolicy={org?.reservePolicy ?? null}
              currentHeldAt={org?.reserveHeldAt ?? null}
            />
            <ReserveTransactionDialog />
          </div>
        </CardHeader>
        <CardContent>
          <ReserveFundSummary
            balance={balance}
            target={org?.reserveTarget ?? null}
            policy={org?.reservePolicy ?? null}
            heldAt={org?.reserveHeldAt ?? null}
            signingAuthority={org?.bankSigningAuthority ?? null}
          />
        </CardContent>
      </Card>

      <ReserveYearTable rows={yearRows} comments={comments} canManage />

      <TransactionList
        transactions={transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          date: t.date,
          description: t.description,
          createdByName: t.createdBy.name ?? t.createdBy.email,
        }))}
      />
    </div>
  )
}
