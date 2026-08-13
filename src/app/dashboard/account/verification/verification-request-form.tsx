"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { requestOrgVerification } from "@/app/actions/org-verification"

export function VerificationRequestForm({ orgName }: { orgName: string }) {
  const router = useRouter()
  const [legalEntityName, setLegalEntityName] = useState("")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [evidenceNotes, setEvidenceNotes] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      await requestOrgVerification({ legalEntityName, registrationNumber, evidenceNotes, evidenceFile })
      setSubmitted(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white border rounded-xl p-6 text-center space-y-2">
        <ShieldCheck className="h-8 w-8 text-green-600 mx-auto" />
        <p className="font-medium">Verification request submitted</p>
        <p className="text-sm text-gray-500">A HOPE platform admin will review it and follow up.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
      <p className="text-sm text-gray-500">
        Help HOPE confirm that {orgName} really exists and that you&apos;re authorized to represent it - a board
        resolution, a governing document, or a recent official filing all work. This is reviewed by a person, not
        auto-approved.
      </p>
      <div className="space-y-1">
        <Label>Legal entity name (optional)</Label>
        <Input value={legalEntityName} onChange={(e) => setLegalEntityName(e.target.value)} placeholder="e.g. Maple Grove Condominium Association, Inc." />
      </div>
      <div className="space-y-1">
        <Label>Registration / corporation number (optional)</Label>
        <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>How are you authorized to represent this organization?</Label>
        <Textarea
          value={evidenceNotes}
          onChange={(e) => setEvidenceNotes(e.target.value)}
          placeholder="e.g. Elected Board President, per the attached board resolution dated..."
          className="h-24"
        />
      </div>
      <div className="space-y-1">
        <Label>Supporting document (optional)</Label>
        <input
          type="file"
          onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:text-sm file:bg-gray-50"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Submitting..." : "Submit for verification"}
      </Button>
    </form>
  )
}
