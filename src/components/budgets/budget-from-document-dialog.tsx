"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, Upload } from "lucide-react"
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
import { draftBudgetFromFile } from "@/app/actions/budgets"

// Upload a prior-year budget / financial statement (PDF or image) -> HOPE
// reads it and creates a DRAFT "Proposed" operating budget to review.
export function BudgetFromDocumentDialog({ detailBasePath }: { detailBasePath: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")
  const [currency, setCurrency] = useState<"auto" | "USD" | "MXN">("auto")
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError("Choose a PDF or image of a previous budget or financial statement.")
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set("file", file)
    if (currency !== "auto") fd.set("currency", currency)
    setBusy(true)
    const result = await draftBudgetFromFile(fd)
    setBusy(false)
    if (result.success) {
      toast.success(`Drafted ${result.count} line items — review before approving`)
      setOpen(false)
      router.push(`${detailBasePath}/${result.id}`)
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(""); setFileName("") } }}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Sparkles className="h-3.5 w-3.5" /> Draft from a document
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Draft a budget from a document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Upload last year&apos;s budget or an annual financial statement (PDF, PNG, or JPG). HOPE reads the line items
            and creates a <span className="font-medium">draft &ldquo;Proposed&rdquo; operating budget</span> — carrying the
            prior figures forward for you to adjust. Nothing is approved.
          </p>

          <div className="space-y-1">
            <Label>Document</Label>
            <label className="flex items-center gap-2 border border-dashed rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:border-gray-300">
              <Upload className="h-4 w-4 text-gray-400 shrink-0" />
              <span className={fileName ? "text-gray-800 truncate" : "text-gray-400"}>
                {fileName || "Choose a PDF or image…"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
          </div>

          <div className="space-y-1">
            <Label>Period</Label>
            <Input name="periodLabel" placeholder="e.g. Fiscal 2027 (leave blank to infer)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Anchor year</Label>
              <Input name="year" type="number" placeholder={`${new Date().getFullYear() + 1}`} />
              <p className="text-[11px] text-gray-400">Blank = infer from the document.</p>
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency((v as "auto" | "USD" | "MXN") ?? "auto")} items={{ auto: "Auto-detect", USD: "USD ($)", MXN: "MXN (pesos)" }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="MXN">MXN (pesos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Exchange rate (optional)</Label>
            <Input name="exchangeRate" type="number" min="0.01" step="0.01" placeholder="Pesos per 1 USD" />
            <p className="text-[11px] text-gray-400">Sets the converted column. You can change it later on the budget.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading… (20–40s)
                </>
              ) : (
                "Draft budget"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
