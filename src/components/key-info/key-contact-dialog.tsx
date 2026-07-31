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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createKeyContact, updateKeyContact } from "@/app/actions/key-info"
import { KeyContactCategory } from "@/generated/prisma"
import { keyContactCategoryLabel } from "@/lib/key-contact-styles"

interface ContactData {
  id: string
  category: KeyContactCategory
  name: string
  role: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

export function KeyContactDialog({
  contact,
  trigger,
}: {
  contact?: ContactData
  trigger?: React.ReactNode
}) {
  const isEdit = !!contact
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [category, setCategory] = useState<KeyContactCategory>(contact?.category ?? "PROPERTY_MANAGER")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const data = {
      category,
      name: form.get("name") as string,
      role: (form.get("role") as string) || undefined,
      phone: (form.get("phone") as string) || undefined,
      email: (form.get("email") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    }
    const result = isEdit ? await updateKeyContact(contact.id, data) : await createKeyContact(data)
    setSaving(false)
    if (result.success) {
      toast.success(isEdit ? "Contact updated" : "Contact added")
      setOpen(false)
    } else {
      setError(result.error || "Failed to save contact")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? (trigger as React.ReactElement) : <Button size="sm">+ Add Contact</Button>} />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Key Contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory((v as KeyContactCategory) ?? "OTHER")}
              items={keyContactCategoryLabel}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(keyContactCategoryLabel) as KeyContactCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>{keyContactCategoryLabel[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" placeholder="Firm or person name" defaultValue={contact?.name} required />
          </div>
          <div className="space-y-1">
            <Label>Role / Title (optional)</Label>
            <Input name="role" placeholder="e.g. HOA Attorney" defaultValue={contact?.role ?? undefined} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="phone" defaultValue={contact?.phone ?? undefined} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={contact?.email ?? undefined} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea name="notes" className="h-16 resize-none" defaultValue={contact?.notes ?? undefined} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
