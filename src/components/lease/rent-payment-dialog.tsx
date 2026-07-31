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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { recordRentPayment } from "@/app/actions/lease"
import { PaymentMethod } from "@/generated/prisma"

const methodLabel: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  CARD: "Card",
  OTHER: "Other",
}

export function RentPaymentDialog({ leaseId, defaultAmount }: { leaseId: string; defaultAmount: number | null }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [alreadyPaid, setAlreadyPaid] = useState(false)
  const [method, setMethod] = useState<string>("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await recordRentPayment(leaseId, {
      amount: Number(form.get("amount")),
      dueDate: form.get("dueDate") as string,
      paidAt: alreadyPaid ? (form.get("paidAt") as string) : undefined,
      paymentMethod: alreadyPaid ? ((method as PaymentMethod) || undefined) : undefined,
      notes: (form.get("notes") as string) || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Rent entry added")
      setOpen(false)
    } else {
      setError(result.error || "Failed to add rent entry")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>+ Add Rent Entry</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Rent Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" defaultValue={defaultAmount ?? undefined} required />
            </div>
            <div className="space-y-1">
              <Label>Due date</Label>
              <Input name="dueDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={alreadyPaid} onChange={(e) => setAlreadyPaid(e.target.checked)} />
            Already paid
          </label>
          {alreadyPaid && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date paid</Label>
                <Input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-1">
                <Label>Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v ?? "")} items={methodLabel}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(methodLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input name="notes" placeholder="e.g. e-transfer reference" />
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
