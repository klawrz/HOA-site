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
import { recordPayment } from "@/app/actions/assessments"
import { PaymentMethod } from "@/generated/prisma"

const methodLabel: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  CARD: "Card",
  OTHER: "Other",
}

export function RecordPaymentDialog({
  chargeId,
  unitLabel,
  amountDue,
  amountPaid,
  paymentMethod,
}: {
  chargeId: string
  unitLabel: string
  amountDue: number
  amountPaid: number
  paymentMethod: PaymentMethod | null
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [method, setMethod] = useState<string>(paymentMethod ?? "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await recordPayment(chargeId, {
      amountPaid: Number(form.get("amountPaid")),
      paymentMethod: (method as PaymentMethod) || undefined,
      paidAt: (form.get("paidAt") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Payment recorded")
      setOpen(false)
    } else {
      toast.error(result.error || "Failed to record payment")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Record Payment</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment — {unitLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Amount paid</Label>
            <Input
              key={amountPaid}
              name="amountPaid"
              type="number"
              min="0"
              step="0.01"
              defaultValue={amountPaid || undefined}
              placeholder={`of $${amountDue.toLocaleString()} due`}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v ?? "")} items={methodLabel}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                {Object.entries(methodLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Date paid</Label>
            <Input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input name="notes" placeholder="e.g. wire reference, cheque number" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
