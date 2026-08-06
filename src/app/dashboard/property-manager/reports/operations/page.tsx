import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getOperationsReportData } from "@/lib/reports-data"
import { OperationsReportView } from "@/components/reports/operations-report-view"

export default async function PropertyManagerOperationsReportPage() {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const [data, org] = await Promise.all([
    getOperationsReportData(session.user.orgId),
    db.organization.findUnique({ where: { id: session.user.orgId }, select: { name: true } }),
  ])

  return <OperationsReportView data={{ ...data, orgName: org?.name ?? "" }} />
}
