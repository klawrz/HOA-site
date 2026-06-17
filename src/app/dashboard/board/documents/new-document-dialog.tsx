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

const categories: { value: DocumentCategory; label: string }[] = [
  { value: "MEETING_MINUTES", label: "Meeting Minutes" },
  { value: "CONTRACT", label: "Contract" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "POLICY", label: "Policy" },
  { value: "OTHER", label: "Other" },
]

export function NewDocumentDialog() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<DocumentCategory>("OTHER")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createDocument({
      title: form.get("title") as string,
      category,
      description: form.get("description") as string,
      content: form.get("content") as string,
      fileUrl: form.get("fileUrl") as string,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Document added")
      setOpen(false)
    } else {
      toast.error("Failed to add document")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + Add Document
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" placeholder="Document title" required />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
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
            <Label>File URL (optional)</Label>
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
