import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import {
  documentCategoryLabel,
  documentCategoryColor,
  documentVisibilityLabel,
  documentVisibilityColor,
} from "@/lib/document-styles"

export default async function PropertyManagerDocumentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const documents = await db.document.findMany({
    where: { orgId: session.user.orgId ?? undefined },
    orderBy: { createdAt: "desc" },
  })

  const grouped = documents.reduce<Record<string, typeof documents>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Document Repository</h1>
        <p className="text-gray-500 mt-1">
          The Board&apos;s document repository - includes items restricted from Owners that you have access to.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length === 0 && <p className="text-sm text-gray-500">No documents on file yet.</p>}
          {Object.entries(grouped).map(([category, docs]) => (
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{d.title}</p>
                        {d.visibility === "BOARD_AND_PM" && (
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${documentVisibilityColor[d.visibility]}`}>
                            {documentVisibilityLabel[d.visibility]}
                          </span>
                        )}
                      </div>
                      {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{d.createdAt.toLocaleDateString()}</p>
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
        </CardContent>
      </Card>
    </div>
  )
}
