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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil } from "lucide-react"
import { createLineItem, updateLineItem } from "@/app/actions/budgets"

interface ContractOption {
  id: string
  title: string
  amount: number | null
  billingPeriod: string | null
}

interface LineItem {
  id: string
  label: string
  budgetedAmount: number
  actualAmount: number | null
  previousYearActual: number | null
  contractId: string | null
}

export function LineItemDialog({
  budgetId,
  contracts,
  item,
}: {
  budgetId: string
  contracts: ContractOption[]
  item?: LineItem
}) {
  const isEdit = !!item
  const [open, setOpen] = useState(false)
  const [contractId, setContractId] = useState(item?.contractId ?? "")
  const [saving, setSaving] = useState(false)

  const contractItems: Record<string, string> = { "": "None" }
  for (const c of contracts) {
    contractItems[c.id] = `${c.title}${c.amount ? ` ($${c.amount.toLocaleString()}${c.billingPeriod ? `/${c.billingPeriod.toLowerCase()}` : ""})` : ""}`
  }

  function applyContractAmount(id: string) {
    setContractId(id)
    const contract = contracts.find((c) => c.id === id)
    if (contract?.amount && !isEdit) {
      const input = document.getElementById(`budgeted-${budgetId}-new`) as HTMLInputElement
      if (input && !input.value) {
        const monthly =
          contract.billingPeriod === "YEARLY"
            ? contract.amount / 12
            : contract.billingPeriod === "WEEKLY"
              ? (contract.amount * 52) / 12
              : contract.amount
        input.value = String(Math.round(monthly * 12))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const data = {
      label: form.get("label") as string,
      budgetedAmount: Number(form.get("budgetedAmount")),
      actualAmount: form.get("actualAmount") ? Number(form.get("actualAmount")) : undefined,
      previousYearActual: form.get("previousYearActual") ? Number(form.get("previousYearActual")) : undefined,
      contractId: contractId || undefined,
    }

    const result = isEdit ? await updateLineItem(item.id, data) : await createLineItem(budgetId, data)
    setSaving(false)
    if (result.success) {
      toast.success(isEdit ? "Line item updated" : "Line item added")
      setOpen(false)
      if (!isEdit) {
        setContractId("")
        ;(document.getElementById(`line-item-form-${budgetId}-new`) as HTMLFormElement)?.reset()
      }
    } else {
      toast.error(result.error ?? "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <button className="text-gray-400 hover:text-blue-500 transition-colors" />
          ) : (
            <Button size="sm" />
          )
        }
      >
        {isEdit ? <Pencil className="h-3.5 w-3.5" /> : "+ Add Line Item"}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
        </DialogHeader>
        <form
          id={`line-item-form-${budgetId}-${isEdit ? item.id : "new"}`}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label>Label</Label>
            <Input name="label" placeholder="e.g. Landscaping, Insurance, Reserve Contribution" defaultValue={item?.label} required />
          </div>
          {contracts.length > 0 && (
            <div className="space-y-1">
              <Label>Link a Contract (optional)</Label>
              <Select value={contractId} onValueChange={(v) => applyContractAmount(v ?? "")} items={contractItems}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {contractItems[c.id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Prefills the budgeted amount from the contract&apos;s annualized cost.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Budgeted Amount</Label>
              <Input
                id={`budgeted-${budgetId}-${item?.id ?? "new"}`}
                name="budgetedAmount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={item?.budgetedAmount}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Actual (optional)</Label>
              <Input name="actualAmount" type="number" min="0" step="0.01" defaultValue={item?.actualAmount ?? undefined} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Previous Year Actual (optional)</Label>
            <Input
              name="previousYearActual"
              type="number"
              min="0"
              step="0.01"
              defaultValue={item?.previousYearActual ?? undefined}
              placeholder="Reference figure for Owners"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Line Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
