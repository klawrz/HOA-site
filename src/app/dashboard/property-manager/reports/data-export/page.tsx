import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { DataExportCard } from "@/components/reports/data-export-card"

export default async function PropertyManagerDataExportPage() {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const org = await db.organization.findUnique({ where: { id: session.user.orgId }, select: { name: true } })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Full Data Export</h1>
        <p className="text-gray-500 mt-1">Download everything HOPE holds for this HOA.</p>
      </div>
      <DataExportCard orgName={org?.name ?? "hoa"} />
    </div>
  )
}
