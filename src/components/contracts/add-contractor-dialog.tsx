"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { ContractorCategory } from "@/generated/prisma"
import { contractorCategoryLabel } from "@/lib/contractor-styles"
import { createContractorRecord } from "@/app/actions/contractor-profile"

const categories = Object.keys(contractorCategoryLabel) as ContractorCategory[]

export function AddContractorDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [phone, setPhone] = useState("")
  const [category, setCategory] = useState<ContractorCategory | "">("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const result = await createContractorRecord({
      name,
      email,
      company: company || undefined,
      phone: phone || undefined,
      category: category || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Contractor added")
      setOpen(false)
      setName("")
      setEmail("")
      setCompany("")
      setPhone("")
      setCategory("")
      router.refresh()
    } else {
      toast.error(result.error ?? "Failed to add contractor")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-1.5" />}>
        <Plus className="h-4 w-4" /> Add Contractor
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Contractor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Plumbing" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-000-0000" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Service Offered</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory((v as ContractorCategory) ?? "")}
              items={contractorCategoryLabel}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {contractorCategoryLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-400">
            This creates a directory entry so you can reach them and attach contracts right away. They
            won&apos;t have portal access unless you invite them separately from Members.
          </p>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name || !email}>
              {saving ? "Adding..." : "Add Contractor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
