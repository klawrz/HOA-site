import { db } from "@/lib/db"
import type { ArchivedReport } from "@/components/reports/archived-reports-list"

// Generated report documents filed to the org's library under the "Report"
// category (they live in the Document Library and also surface on the
// Reports page). The category is matched in code rather than the query so
// it keeps working against a Prisma client that predates the REPORT enum
// value; a title containing "report" is accepted too, for anything filed
// before the category existed.
export async function loadArchivedReports(
  orgId: string | null | undefined,
): Promise<ArchivedReport[]> {
  if (!orgId) return []

  const docs = await db.document.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } })
  const reportDocs = docs.filter((d) => d.category === "REPORT" || /\breport\b/i.test(d.title))

  const uploaderIds = [...new Set(reportDocs.map((d) => d.uploadedById))]
  const uploaders = uploaderIds.length
    ? await db.user.findMany({
        where: { id: { in: uploaderIds } },
        select: { id: true, name: true, email: true },
      })
    : []
  const nameById = new Map(uploaders.map((u) => [u.id, u.name ?? u.email ?? null]))

  return reportDocs.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    fileUrl: d.fileUrl,
    createdAt: d.createdAt,
    uploadedByName: nameById.get(d.uploadedById) ?? null,
  }))
}
