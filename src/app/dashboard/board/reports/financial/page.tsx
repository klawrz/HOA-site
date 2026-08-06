import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getFinancialReportData } from "@/lib/reports-data"
import { FinancialReportView } from "@/components/reports/financial-report-view"

export default async function BoardFinancialReportPage() {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const data = await getFinancialReportData(session.user.orgId)

  return (
    <FinancialReportView
      data={{
        orgName: data.org?.name ?? "",
        currency: data.org?.baseCurrency ?? "USD",
        reserveBalance: data.reserveBalance,
        reserveTarget: data.reserveTarget,
        reserveHeldAt: data.reserveHeldAt,
        reserveYearRows: data.reserveYearRows,
        bankSigningAuthority: data.org?.bankSigningAuthority ?? null,
        budgets: data.budgets,
        assessments: data.assessments,
        assessmentTotals: data.assessmentTotals,
      }}
    />
  )
}
