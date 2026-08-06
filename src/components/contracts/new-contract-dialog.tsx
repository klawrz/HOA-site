"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Sparkles, Loader2 } from "lucide-react"
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
import { ContractType, ContractorCategory, BillingPeriod } from "@/generated/prisma"
import { contractTypeLabel, billingPeriodLabel } from "@/lib/contract-styles"
import { contractorCategoryLabel } from "@/lib/contractor-styles"
import { createPropertyContract, createUnitContract, extractContractFromFile } from "@/app/actions/contracts"
import { createContractorRecord } from "@/app/actions/contractor-profile"

interface Contractor {
  id: string
  name: string | null
  email: string
  company: string | null
  category: string | null
}

const types = Object.keys(contractTypeLabel) as ContractType[]
const contractorCategories = Object.keys(contractorCategoryLabel) as ContractorCategory[]
const billingPeriods = Object.keys(billingPeriodLabel) as BillingPeriod[]

function contractorLabel(c: Contractor) {
  const category = c.category ? contractorCategoryLabel[c.category] : null
  const name = c.name ?? c.email
  const company = c.company ? ` (${c.company})` : ""
  return category ? `${category} — ${name}${company}` : `${name}${company}`
}

type Props = ({ scope: "property"; orgId: string } | { scope: "unit"; unitId: string }) & {
  contractors: Contractor[]
}

export function NewContractDialog(props: Props) {
  const { scope } = props
  const [open, setOpen] = useState(false)
  const [contractorList, setContractorList] = useState(props.contractors)
  const [contractorId, setContractorId] = useState("")
  const [type, setType] = useState<ContractType>("PROJECT")
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY")
  const [saving, setSaving] = useState(false)
  const [showNewContractor, setShowNewContractor] = useState(false)
  const [newContractorName, setNewContractorName] = useState("")
  const [newContractorEmail, setNewContractorEmail] = useState("")
  const [newContractorCompany, setNewContractorCompany] = useState("")
  const [newContractorPhone, setNewContractorPhone] = useState("")
  const [newContractorCategory, setNewContractorCategory] = useState<ContractorCategory | "">("")
  const [addingContractor, setAddingContractor] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [prefill, setPrefill] = useState<{
    title: string
    startDate: string
    endDate: string | null
    amount: number | null
    description: string
    fileUrl: string
  } | null>(null)
  const [prefillKey, setPrefillKey] = useState(0)

  const canExtract = selectedFileType === "application/pdf" || selectedFileType === "image/png" || selectedFileType === "image/jpeg"

  async function handleExtract() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setExtracting(true)
    const fd = new FormData()
    fd.set("file", file)
    const result = await extractContractFromFile(fd)
    setExtracting(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    const { fields } = result
    // fileUrl is kept in state (not just set imperatively on the input via
    // a ref) so it survives the dialog's content remounting - e.g. if it
    // closes and reopens before submit, an uncontrolled input's value set
    // only via ref would be lost, but defaultValue-from-state below isn't.
    setPrefill({ title: fields.title, startDate: fields.startDate, endDate: fields.endDate, amount: fields.amount, description: fields.description, fileUrl: result.fileUrl })
    setPrefillKey((k) => k + 1)
    setType(fields.type)
    if (fields.billingPeriod) setBillingPeriod(fields.billingPeriod)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setSelectedFileType(null)
    if (result.matchedContractorId) {
      setContractorId(result.matchedContractorId)
      setShowNewContractor(false)
    } else {
      setShowNewContractor(true)
      setContractorId("")
      setNewContractorName(fields.contractorName ?? "")
      setNewContractorEmail(fields.contractorEmail ?? "")
      setNewContractorCompany(fields.contractorCompany ?? "")
    }
    toast.success("Details extracted - review before saving")
  }

  const sortedContractors = [...contractorList].sort((a, b) => {
    const catA = a.category ?? "￿"
    const catB = b.category ?? "￿"
    if (catA !== catB) return catA.localeCompare(catB)
    return (a.name ?? a.email).localeCompare(b.name ?? b.email)
  })

  async function handleAddContractor() {
    if (!newContractorName || !newContractorEmail) return
    setAddingContractor(true)
    const result = await createContractorRecord({
      name: newContractorName,
      email: newContractorEmail,
      company: newContractorCompany || undefined,
      phone: newContractorPhone || undefined,
      category: newContractorCategory || undefined,
    })
    setAddingContractor(false)
    if (result.success && result.contractor) {
      setContractorList((prev) => [...prev, result.contractor as Contractor])
      setContractorId(result.contractor.id)
      setShowNewContractor(false)
      setNewContractorName("")
      setNewContractorEmail("")
      setNewContractorCompany("")
      setNewContractorPhone("")
      setNewContractorCategory("")
      toast.success("Contractor added")
    } else {
      toast.error(result.error ?? "Failed to add contractor")
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!contractorId) return
    setSaving(true)
    const form = new FormData(e.currentTarget)
    form.set("type", type)
    form.set("contractorId", contractorId)
    if (type === "RECURRING") form.set("billingPeriod", billingPeriod)
    const uploadedFile = form.get("file")
    if (uploadedFile instanceof File && uploadedFile.size === 0) form.delete("file")

    const result =
      props.scope === "property"
        ? await createPropertyContract(props.orgId, form)
        : await createUnitContract(props.unitId, form)
    setSaving(false)
    if (result.success) {
      toast.success("Contract created")
      setOpen(false)
      setContractorId("")
      setType("PROJECT")
      setBillingPeriod("MONTHLY")
      setPrefill(null)
      setSelectedFileType(null)
      ;(document.getElementById(`contract-form-${scope}`) as HTMLFormElement)?.reset()
    } else {
      toast.error(result.error ?? "Failed to create contract")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>+ New Contract</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Contract</DialogTitle>
        </DialogHeader>
        <form id={`contract-form-${scope}`} onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <Label>Already signed? Upload it</Label>
            <Input
              ref={fileInputRef}
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setSelectedFileType(e.target.files?.[0]?.type ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExtract}
              disabled={!canExtract || extracting}
              className="gap-1.5"
            >
              {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {extracting ? "Reading document..." : "Extract Details from File"}
            </Button>
            <p className="text-xs text-gray-400">
              Reads the PDF/PNG/JPG and fills in what it can below - review everything before saving.
            </p>
            {prefill && <p className="text-xs text-blue-600">Extracted from the uploaded document - review before saving.</p>}
          </div>
          <div className="space-y-1">
            <Label>Contract Title</Label>
            <Input key={`title-${prefillKey}`} name="title" placeholder="e.g. Landscaping Services 2026" defaultValue={prefill?.title} required />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ContractType)} items={contractTypeLabel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {contractTypeLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Recurring: ongoing services/utilities. Project: one-off work. Critical: insurance or
              government/regulatory - highlighted and expiry-tracked.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Contractor</Label>
              <button
                type="button"
                onClick={() => setShowNewContractor((v) => !v)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showNewContractor ? "Cancel" : "+ Add New Contractor"}
              </button>
            </div>
            {!showNewContractor && (
              <Select
                value={contractorId}
                onValueChange={(v) => setContractorId(v ?? "")}
                required
                items={Object.fromEntries(sortedContractors.map((c) => [c.id, contractorLabel(c)]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contractor" />
                </SelectTrigger>
                <SelectContent>
                  {sortedContractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {contractorLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {showNewContractor && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      value={newContractorName}
                      onChange={(e) => setNewContractorName(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newContractorEmail}
                      onChange={(e) => setNewContractorEmail(e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Service Type</Label>
                  <Select
                    value={newContractorCategory}
                    onValueChange={(v) => setNewContractorCategory((v as ContractorCategory) ?? "")}
                    items={contractorCategoryLabel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractorCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {contractorCategoryLabel[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Company</Label>
                    <Input
                      value={newContractorCompany}
                      onChange={(e) => setNewContractorCompany(e.target.value)}
                      placeholder="e.g. Acme Plumbing"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input
                      value={newContractorPhone}
                      onChange={(e) => setNewContractorPhone(e.target.value)}
                      placeholder="555-000-0000"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddContractor}
                  disabled={addingContractor || !newContractorName || !newContractorEmail}
                >
                  {addingContractor ? "Adding..." : "Add Contractor"}
                </Button>
                <p className="text-xs text-gray-400">
                  This creates a directory entry so you can pick them right away. They won&apos;t have
                  portal access unless you invite them separately from Members.
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input key={`startDate-${prefillKey}`} name="startDate" type="date" defaultValue={prefill?.startDate} required />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input key={`endDate-${prefillKey}`} name="endDate" type="date" defaultValue={prefill?.endDate ?? undefined} />
            </div>
          </div>
          {type === "CRITICAL" && (
            <div className="space-y-1">
              <Label>Remind me (days before expiry)</Label>
              <Input name="reminderDaysBefore" type="number" min="0" placeholder="30" />
            </div>
          )}
          <div className={type === "RECURRING" ? "grid grid-cols-2 gap-3" : "space-y-1"}>
            <div className="space-y-1">
              <Label>Amount ($)</Label>
              <Input key={`amount-${prefillKey}`} name="amount" type="number" min="0" step="0.01" placeholder="0.00" defaultValue={prefill?.amount ?? undefined} />
            </div>
            {type === "RECURRING" && (
              <div className="space-y-1">
                <Label>Billed Per</Label>
                <Select
                  value={billingPeriod}
                  onValueChange={(v) => setBillingPeriod(v as BillingPeriod)}
                  items={billingPeriodLabel}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billingPeriods.map((p) => (
                      <SelectItem key={p} value={p}>
                        {billingPeriodLabel[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea key={`description-${prefillKey}`} name="description" placeholder="Scope of work..." className="h-20 resize-none" defaultValue={prefill?.description} />
          </div>
          <div className="space-y-1">
            <Label>Or Link to File (optional)</Label>
            <Input
              key={`fileUrl-${prefillKey}`}
              name="fileUrl"
              type="text"
              placeholder="https://..."
              defaultValue={prefill?.fileUrl}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !contractorId}>
              {saving ? "Creating..." : "Create Contract"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
