import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { FileText } from "lucide-react"
import { documentCategoryLabel, documentCategoryColor } from "@/lib/document-styles"
import { NewDocumentDialog } from "@/app/dashboard/board/documents/new-document-dialog"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmDocumentInventoryForLibrary } from "@/lib/agm"

// Split out of the main Governance page 2026-08-28 per Dara: an owner
// looking at Board information doesn't need the full document repository
// inline - a compact link there is enough, with the full listing living
// here for whoever actually wants it. Same query/visibility rule as
// before (Board-authorized owners also see BOARD_AND_PM docs, not just
// the OWNERS tier).
export default async function OwnerDocumentsPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "OWNER")) redirect("/dashboard")

  const isBoardMember = session.user.isBoardMember

  const [documents, agmInventory] = await Promise.all([
    db.document.findMany({
      where: { orgId: session.user.orgId ?? undefined, ...(isBoardMember ? {} : { visibility: "OWNERS" }) },
      orderBy: { createdAt: "desc" },
    }),
    // The AGM package's generated documents only have a live route to view,
    // not a file - and those routes are Board/PM-only, so a plain (non
    // Board Member) owner has no page to send them to.
    isBoardMember ? getAgmDocumentInventoryForLibrary(session.user.orgId ?? "") : Promise.resolve(null),
  ])

  const groupedDocs = documents.reduce<Record<string, typeof documents>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-gray-500 mt-1">{documents.length} document{documents.length !== 1 ? "s" : ""} on file</p>
        </div>
        {isBoardMember && <NewDocumentDialog />}
      </div>

      {agmInventory && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-100 text-sky-800">
              AGM {agmInventory.agmYear} Package
            </span>
            <span className="text-xs text-gray-400">
              {agmInventory.items.length} document{agmInventory.items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {agmInventory.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      #{item.number} {item.title}
                      <span className="text-xs text-gray-400 font-normal"> · Rev {item.revision}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {item.source === "GENERATED" ? "Generated for the package" : "Uploaded"}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                  </div>
                </div>
                {item.href && (
                  <Link href={item.href} target="_blank" className="text-xs text-blue-600 hover:underline shrink-0">
                    View
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && <p className="text-sm text-gray-500">No documents on file yet.</p>}

      {Object.entries(groupedDocs).map(([category, docs]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${documentCategoryColor[category]}`}>
              {documentCategoryLabel[category]}
            </span>
            <span className="text-xs text-gray-400">{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{d.title}</p>
                    {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{d.createdAt.toLocaleDateString()}</p>
                  </div>
                </div>
                {d.fileUrl && (
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline shrink-0"
                  >
                    View file
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
