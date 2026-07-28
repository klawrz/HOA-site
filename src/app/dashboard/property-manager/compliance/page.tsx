import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Building2 } from "lucide-react"
import { ComplianceDocumentList } from "@/components/compliance/compliance-document-list"
import { NewComplianceDocumentDialog } from "@/components/compliance/new-compliance-document-dialog"

export default async function PMCompliancePage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const membership = await db.pMStaffMembership.findFirst({
    where: { userId: session.user.id },
    include: { company: true },
  })

  if (!membership) {
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Compliance</h1>
          <p className="text-gray-500 mt-1">
            Set up your company profile first to start tracking compliance documents.
          </p>
        </div>
      </div>
    )
  }

  const isAdmin = membership.company.createdById === session.user.id

  const companyDocs = await db.complianceDocument.findMany({
    where: { companyId: membership.company.id },
    include: { uploadedBy: true },
    orderBy: { createdAt: "desc" },
  })

  const docGrants = await db.pMAccessGrant.findMany({
    where: { membershipId: membership.id, area: "DOCUMENTS" },
    include: { org: true },
  })

  const orgSections = await Promise.all(
    docGrants.map(async (grant) => ({
      org: grant.org,
      canManage: grant.level === "MANAGE",
      documents: await db.complianceDocument.findMany({
        where: { orgId: grant.orgId },
        include: { uploadedBy: true },
        orderBy: { createdAt: "desc" },
      }),
    }))
  )

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Compliance</h1>
        <p className="text-gray-500 mt-1">
          {membership.company.legalName}&apos;s own compliance records, plus any HOA records you have
          document access to.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-700">{membership.company.legalName}</h2>
          {isAdmin && <NewComplianceDocumentDialog scope="company" />}
        </div>
        <ComplianceDocumentList
          documents={companyDocs}
          canManage={isAdmin}
          emptyMessage="No compliance documents on file for your company yet."
        />
      </div>

      {orgSections.map(({ org, canManage, documents }) => (
        <div key={org.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-sm text-gray-700">{org.name}</h2>
            </div>
            {canManage && <NewComplianceDocumentDialog scope="org" orgId={org.id} />}
          </div>
          <ComplianceDocumentList
            documents={documents}
            canManage={canManage}
            emptyMessage={`No compliance documents on file for ${org.name} yet.`}
          />
        </div>
      ))}

      {orgSections.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-400 text-sm">
            You don&apos;t have document access granted for any HOA yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
