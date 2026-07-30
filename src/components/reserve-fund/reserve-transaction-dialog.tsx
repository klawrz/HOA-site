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
import { createReserveTransaction } from "@/app/actions/reserve-fund"
import { ReserveTransactionType } from "@/generated/prisma"

export function ReserveTransactionDialog() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [type, setType] = useState<ReserveTransactionType>("DEPOSIT")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createReserveTransaction({
      type,
      amount: Number(form.get("amount")),
      date: form.get("date") as string,
      description: form.get("description") as string,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Transaction recorded")
      setOpen(false)
    } else {
      setError(result.error || "Failed to record transaction")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ New Transaction</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Reserve Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v as ReserveTransactionType) ?? "DEPOSIT")}
              items={{ DEPOSIT: "Deposit", WITHDRAWAL: "Withdrawal" }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input name="description" placeholder="e.g. Q1 dues surplus, pool concession renewal" required />
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
