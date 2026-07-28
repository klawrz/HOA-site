import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ComplianceDocumentList } from "@/components/compliance/compliance-document-list"
import { NewComplianceDocumentDialog } from "@/components/compliance/new-compliance-document-dialog"

export default async function BoardCompliancePage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER" || !session.user.orgId) redirect("/dashboard")

  const documents = await db.complianceDocument.findMany({
    where: { orgId: session.user.orgId },
    include: { uploadedBy: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance</h1>
          <p className="text-gray-500 mt-1">
            Entity registration, tax filings, insurance, and permits - separate from the contract library.
          </p>
        </div>
        <NewComplianceDocumentDialog scope="org" orgId={session.user.orgId} />
      </div>
      <ComplianceDocumentList documents={documents} canManage />
    </div>
  )
}
