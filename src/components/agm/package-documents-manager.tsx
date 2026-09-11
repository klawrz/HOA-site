"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addAgmDocumentItem,
  updateAgmDocumentItem,
  removeAgmDocumentItem,
} from "@/app/actions/agm"

export type PackageDocumentItem = {
  id: string
  number: number
  title: string
  revision: string
  source: "GENERATED" | "UPLOADED"
  includeInDetailed: boolean
  includeInSummary: boolean
  document: { id: string; title: string; fileUrl: string | null } | null
}

export type AvailableDocument = { id: string; title: string; category: string }

function AddDocumentDialog({ availableDocuments }: { availableDocuments: AvailableDocument[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"existing" | "upload">(
    availableDocuments.length > 0 ? "existing" : "upload"
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const r = await addAgmDocumentItem(new FormData(e.currentTarget))
    setSaving(false)
    if (r.success) {
      toast.success("Document added to the package")
      setOpen(false)
      router.refresh()
    } else {
      setError(r.error || "Failed to add")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
        <Plus className="h-3.5 w-3.5" /> Add document
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a document to the package</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {availableDocuments.length > 0 && (
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`px-2.5 py-1 rounded-md border ${mode === "existing" ? "bg-gray-900 text-white border-gray-900" : "text-gray-600"}`}
              >
                From the Document Library
              </button>
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`px-2.5 py-1 rounded-md border ${mode === "upload" ? "bg-gray-900 text-white border-gray-900" : "text-gray-600"}`}
              >
                Upload new
              </button>
            </div>
          )}
          {mode === "existing" ? (
            <div className="space-y-1">
              <Label>Document</Label>
              <select name="documentId" required className="w-full border rounded-md px-2 py-1.5 text-sm">
                {availableDocuments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label>Title (optional - defaults to the filename)</Label>
                <Input name="title" placeholder="e.g. Reserve Study 2027" />
              </div>
              <div className="space-y-1">
                <Label>File</Label>
                <input name="file" type="file" required className="text-sm" />
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PackageDocumentsManager({
  items,
  availableDocuments,
}: {
  items: PackageDocumentItem[]
  availableDocuments: AvailableDocument[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [revisionDrafts, setRevisionDrafts] = useState<Record<string, string>>({})

  function toggle(item: PackageDocumentItem, field: "includeInDetailed" | "includeInSummary") {
    startTransition(async () => {
      const r = await updateAgmDocumentItem(item.id, { [field]: !item[field] })
      if (r.success) router.refresh()
      else toast.error(r.error || "Could not update")
    })
  }

  function saveRevision(item: PackageDocumentItem) {
    const revision = revisionDrafts[item.id]
    if (revision === undefined || revision === item.revision) return
    startTransition(async () => {
      const r = await updateAgmDocumentItem(item.id, { revision })
      if (r.success) {
        toast.success("Revision updated")
        router.refresh()
      } else toast.error(r.error || "Could not update")
    })
  }

  function remove(item: PackageDocumentItem) {
    if (!confirm(`Remove "${item.title}" from the package?`)) return
    startTransition(async () => {
      const r = await removeAgmDocumentItem(item.id)
      if (r.success) {
        toast.success("Removed")
        router.refresh()
      } else toast.error(r.error || "Could not remove")
    })
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Package documents</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Every document that may go into the Detailed or Summary package, numbered with a
            revision. Uncheck a package column to leave a document out of it.
          </p>
        </div>
        <AddDocumentDialog availableDocuments={availableDocuments} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-gray-400">
              <th className="text-left font-medium py-2 pr-2 w-10">#</th>
              <th className="text-left font-medium py-2 px-2">Title</th>
              <th className="text-left font-medium py-2 px-2 w-20">Rev</th>
              <th className="text-center font-medium py-2 px-2 w-20">Detailed</th>
              <th className="text-center font-medium py-2 px-2 w-20">Summary</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 pr-2 tabular-nums text-gray-400">{item.number}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="font-medium">{item.title}</span>
                    {item.source === "GENERATED" && (
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                        generated
                      </span>
                    )}
                    {item.document?.fileUrl && (
                      <a
                        href={item.document.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        view
                      </a>
                    )}
                  </div>
                </td>
                <td className="py-2 px-2">
                  <Input
                    value={revisionDrafts[item.id] ?? item.revision}
                    onChange={(e) => setRevisionDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                    onBlur={() => saveRevision(item)}
                    disabled={pending}
                    className="h-7 w-14 text-xs"
                  />
                </td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={item.includeInDetailed}
                    disabled={pending}
                    onChange={() => toggle(item, "includeInDetailed")}
                  />
                </td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={item.includeInSummary}
                    disabled={pending}
                    onChange={() => toggle(item, "includeInSummary")}
                  />
                </td>
                <td className="py-2 px-2 text-right">
                  {item.source === "UPLOADED" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(item)}
                      className="text-gray-400 hover:text-red-600"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
