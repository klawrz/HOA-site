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
import { ComplianceDocumentCategory, HomeownerMeetingDocType } from "@/generated/prisma"
import { complianceCategoryLabel, meetingDocTypeLabel } from "@/lib/compliance-styles"
import {
  createOrgComplianceDocument,
  createCompanyComplianceDocument,
} from "@/app/actions/compliance-documents"

const categories = Object.keys(complianceCategoryLabel) as ComplianceDocumentCategory[]
const meetingDocTypes = Object.keys(meetingDocTypeLabel) as HomeownerMeetingDocType[]

type Props =
  | { scope: "org"; orgId: string }
  | { scope: "company" }

export function NewComplianceDocumentDialog(props: Props) {
  const { scope } = props
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ComplianceDocumentCategory>("OTHER")
  const [meetingDocType, setMeetingDocType] = useState<HomeownerMeetingDocType>("MINUTES")
  const [minutesFilingRequired, setMinutesFilingRequired] = useState(false)
  const [minutesFiled, setMinutesFiled] = useState(false)
  const [saving, setSaving] = useState(false)

  const isHomeownerMeetings = category === "HOMEOWNER_MEETINGS"
  const isMinutes = isHomeownerMeetings && meetingDocType === "MINUTES"

  function resetExtras() {
    setCategory("OTHER")
    setMeetingDocType("MINUTES")
    setMinutesFilingRequired(false)
    setMinutesFiled(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    form.set("category", category)
    if (isHomeownerMeetings) {
      form.set("meetingDocType", meetingDocType)
    } else {
      form.delete("meetingYear")
    }
    if (isMinutes) {
      form.set("minutesFilingRequired", String(minutesFilingRequired))
      form.set("minutesFiled", String(minutesFiled))
      if (!minutesFiled) form.delete("minutesFiledAt")
    } else {
      form.delete("minutesFiledAt")
    }
    const uploadedFile = form.get("file")
    if (uploadedFile instanceof File && uploadedFile.size === 0) form.delete("file")

    const result =
      props.scope === "org"
        ? await createOrgComplianceDocument(props.orgId, form)
        : await createCompanyComplianceDocument(form)
    setSaving(false)
    if (result.success) {
      toast.success("Document added")
      setOpen(false)
      resetExtras()
      ;(document.getElementById(`compliance-doc-form-${scope}`) as HTMLFormElement)?.reset()
    } else {
      toast.error(result.error ?? "Failed to add document")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>+ Add Document</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Compliance Document</DialogTitle>
        </DialogHeader>
        <form
          id={`compliance-doc-form-${scope}`}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" placeholder="e.g. Certificate of Insurance" required />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ComplianceDocumentCategory)}
              items={complianceCategoryLabel}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {complianceCategoryLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input name="description" placeholder="Brief description" />
          </div>

          {isHomeownerMeetings && (
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3">
              <div className="space-y-1">
                <Label>Meeting Year</Label>
                <Input name="meetingYear" type="number" placeholder="2026" required />
              </div>
              <div className="space-y-1">
                <Label>Document Type</Label>
                <Select
                  value={meetingDocType}
                  onValueChange={(v) => setMeetingDocType(v as HomeownerMeetingDocType)}
                  items={meetingDocTypeLabel}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingDocTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {meetingDocTypeLabel[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isMinutes && (
                <div className="col-span-2 space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-gray-900"
                      checked={minutesFilingRequired}
                      onChange={(e) => setMinutesFilingRequired(e.target.checked)}
                    />
                    Legal filing of minutes required
                  </label>
                  {minutesFilingRequired && (
                    <>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="accent-gray-900"
                          checked={minutesFiled}
                          onChange={(e) => setMinutesFiled(e.target.checked)}
                        />
                        Minutes have been filed
                      </label>
                      {minutesFiled && (
                        <div className="space-y-1">
                          <Label>Filed On</Label>
                          <Input name="minutesFiledAt" type="date" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Issued</Label>
              <Input name="issuedAt" type="date" />
            </div>
            <div className="space-y-1">
              <Label>Expires</Label>
              <Input name="expiresAt" type="date" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Remind me (days before expiry)</Label>
            <Input name="reminderDaysBefore" type="number" min="0" placeholder="30" />
          </div>
          <div className="space-y-1">
            <Label>Language (optional)</Label>
            <Input name="language" placeholder="e.g. English, Spanish" />
          </div>
          <div className="space-y-1">
            <Label>Upload File (optional)</Label>
            <Input name="file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
          </div>
          <div className="space-y-1">
            <Label>Or Link to File (optional)</Label>
            <Input name="fileUrl" type="url" placeholder="https://..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Document"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
