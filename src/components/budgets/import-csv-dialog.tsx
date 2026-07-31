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
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"
import { importBudgetLineItemsFromCsv } from "@/app/actions/budgets"

export function ImportCsvDialog({ budgetId }: { budgetId: string }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [file, setFile] = useState<File | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!file) {
      setError("Choose a CSV file first")
      return
    }
    setSaving(true)
    const text = await file.text()
    const result = await importBudgetLineItemsFromCsv(budgetId, text)
    setSaving(false)
    if (result.success) {
      toast.success(`Imported ${result.count} line item${result.count !== 1 ? "s" : ""}`)
      setOpen(false)
      setFile(null)
    } else {
      setError(result.error || "Failed to import file")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
        <Upload className="h-3.5 w-3.5" /> Import CSV
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Import Line Items from CSV</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>CSV file</Label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm"
            />
            <p className="text-xs text-gray-400">
              Needs a line-item label column and a budgeted-amount column - e.g. &quot;Line Item&quot; and
              &quot;Budgeted&quot;. Actual and Prior Year Actual columns are optional. Have an Excel file? Save it
              as CSV first.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Importing..." : "Import"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
