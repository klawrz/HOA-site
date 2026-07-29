"use client"

import { useState } from "react"
import { toast } from "sonner"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createDocument } from "@/app/actions/documents"
import { DocumentCategory } from "@/generated/prisma"
import { documentCategoryLabel } from "@/lib/document-styles"

const categories = Object.keys(documentCategoryLabel) as DocumentCategory[]

export function NewDocumentDialog() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<DocumentCategory>("OTHER")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    form.set("category", category)
    const uploadedFile = form.get("file")
    if (uploadedFile instanceof File && uploadedFile.size === 0) form.delete("file")

    const result = await createDocument(form)
    setSaving(false)
    if (result.success) {
      toast.success("Document added")
      setOpen(false)
      setCategory("OTHER")
      ;(document.getElementById("new-document-form") as HTMLFormElement)?.reset()
    } else {
      toast.error(result.error ?? "Failed to add document")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + Add Document
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
        </DialogHeader>
        <form id="new-document-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" placeholder="Document title" required />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)} items={documentCategoryLabel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {documentCategoryLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input name="description" placeholder="Brief description" />
          </div>
          <div className="space-y-1">
            <Label>Content (inline)</Label>
            <Textarea
              name="content"
              placeholder="Paste document content here..."
              className="h-28 resize-none text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label>Upload File (optional)</Label>
            <Input name="file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
          </div>
          <div className="space-y-1">
            <Label>Or Link to File (optional)</Label>
            <Input name="fileUrl" type="url" placeholder="https://..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Document"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
