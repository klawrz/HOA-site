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
import { setBankInfo } from "@/app/actions/key-info"

interface BankInfo {
  bankName: string | null
  bankAddress: string | null
  bankPhone: string | null
  bankAccountName: string | null
  bankSigningAuthority: string | null
  bankPaymentInstructions: string | null
  bankContactName: string | null
  bankContactPhone: string | null
  bankContactEmail: string | null
}

export function BankInfoDialog({ bank }: { bank: BankInfo }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await setBankInfo({
      bankName: (form.get("bankName") as string) ?? "",
      bankAddress: (form.get("bankAddress") as string) ?? "",
      bankPhone: (form.get("bankPhone") as string) ?? "",
      bankAccountName: (form.get("bankAccountName") as string) ?? "",
      bankSigningAuthority: (form.get("bankSigningAuthority") as string) ?? "",
      bankPaymentInstructions: (form.get("bankPaymentInstructions") as string) ?? "",
      bankContactName: (form.get("bankContactName") as string) ?? "",
      bankContactPhone: (form.get("bankContactPhone") as string) ?? "",
      bankContactEmail: (form.get("bankContactEmail") as string) ?? "",
    })
    setSaving(false)
    if (result.success) {
      toast.success("Bank information updated")
      setOpen(false)
    } else {
      setError("Failed to update bank information")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bank Information</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Bank name</Label>
            <Input key={bank.bankName} name="bankName" placeholder="e.g. First National Bank" defaultValue={bank.bankName ?? undefined} />
          </div>
          <div className="space-y-1">
            <Label>Branch address</Label>
            <Input
              key={bank.bankAddress}
              name="bankAddress"
              placeholder="Street, city, state/province, postal code"
              defaultValue={bank.bankAddress ?? undefined}
            />
          </div>
          <div className="space-y-1">
            <Label>Branch phone</Label>
            <Input key={bank.bankPhone} name="bankPhone" placeholder="Branch phone number" defaultValue={bank.bankPhone ?? undefined} />
          </div>
          <div className="space-y-1">
            <Label>Account</Label>
            <Input
              key={bank.bankAccountName}
              name="bankAccountName"
              placeholder="e.g. Sunrise Heights HOA Operating Account"
              defaultValue={bank.bankAccountName ?? undefined}
            />
          </div>
          <div className="space-y-1">
            <Label>Signing authority</Label>
            <Textarea
              key={bank.bankSigningAuthority}
              name="bankSigningAuthority"
              placeholder="Who is authorized to sign/approve on the account, e.g. President and Treasurer, two signatures required"
              className="h-16 resize-none"
              defaultValue={bank.bankSigningAuthority ?? undefined}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="col-span-3">
              <Label>Bank key contact</Label>
            </div>
            <Input key={bank.bankContactName} name="bankContactName" placeholder="Contact name" defaultValue={bank.bankContactName ?? undefined} />
            <Input key={bank.bankContactPhone} name="bankContactPhone" placeholder="Phone" defaultValue={bank.bankContactPhone ?? undefined} />
            <Input key={bank.bankContactEmail} name="bankContactEmail" type="email" placeholder="Email" defaultValue={bank.bankContactEmail ?? undefined} />
          </div>
          <div className="space-y-1">
            <Label>How to pay dues / send funds</Label>
            <Textarea
              key={bank.bankPaymentInstructions}
              name="bankPaymentInstructions"
              placeholder="e-transfer email, wire routing/account number, or other instructions for owners paying dues or sending funds"
              className="h-20 resize-none"
              defaultValue={bank.bankPaymentInstructions ?? undefined}
            />
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
