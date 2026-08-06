"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { submitPMReferral } from "@/app/actions/pm-referrals"

type Referral = {
  id: string
  propertyName: string
  estimatedUnits: number | null
  status: string
  createdAt: Date
}

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-600",
  CONTACTED: "bg-blue-100 text-blue-700",
  CONVERTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-600",
}

export function PMReferralCard({ referrals }: { referrals: Referral[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      await submitPMReferral(new FormData(e.currentTarget))
      toast.success("Thanks - we'll follow up about this property")
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Manage other properties?
        </CardTitle>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Tell us about one
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">
          If you manage other HOAs or communities, let us know and we&apos;ll reach out about bringing them onto
          HOPE too. Completely optional.
        </p>

        {open && (
          <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <div className="space-y-1">
              <Label>Property name</Label>
              <Input name="propertyName" placeholder="e.g. Ocean View Condos" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Estimated units</Label>
                <Input name="estimatedUnits" type="number" min={1} placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label>Contact name</Label>
                <Input name="contactName" placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Contact email</Label>
                <Input name="contactEmail" type="email" placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label>Contact phone</Label>
                <Input name="contactPhone" placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea name="notes" placeholder="Anything else useful to know" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Sending..." : "Send"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {referrals.length > 0 && (
          <div className="space-y-1.5">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-gray-700">
                  {r.propertyName}
                  {r.estimatedUnits ? ` · ~${r.estimatedUnits} units` : ""}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status] ?? STATUS_STYLE.NEW}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
