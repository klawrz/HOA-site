import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { NewDocumentDialog } from "./new-document-dialog"
import { documentCategoryLabel, documentCategoryColor } from "@/lib/document-styles"

export default async function DocumentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const documents = await db.document.findMany({
    orderBy: { createdAt: "desc" },
  })

  const grouped = documents.reduce<Record<string, typeof documents>>(
    (acc, d) => {
      const key = d.category
      if (!acc[key]) acc[key] = []
      acc[key].push(d)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Library</h1>
          <p className="text-gray-500 mt-1">
            {documents.length} documents across {Object.keys(grouped).length} categories
          </p>
        </div>
        <NewDocumentDialog />
      </div>

      {Object.entries(grouped).map(([category, docs]) => {
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${documentCategoryColor[category]}`}>
                {documentCategoryLabel[category]}
              </span>
              <span className="text-sm text-gray-400">{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {docs.map((d) => (
                <Card key={d.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{d.title}</p>
                          {d.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>
                          )}
                          {d.content && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2 bg-gray-50 p-2 rounded">
                              {d.content}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(d.createdAt).toLocaleDateString()}
                          </p>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      {documents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            No documents yet. Add the first one.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
