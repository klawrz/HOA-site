"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { X, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { applyImportedUnitContactData, dismissImportedUnitContactData } from "@/app/actions/unit-profile"

type ImportedContactData = {
  ownerPhone: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  unitManagerName: string | null
  unitManagerCompany: string | null
  unitManagerEmail: string | null
  unitManagerPhone: string | null
}

export function ImportedContactPrompt({ unitId, data }: { unitId: string; data: ImportedContactData }) {
  const router = useRouter()
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  if (hidden) return null

  async function handleApply() {
    setBusy(true)
    const result = await applyImportedUnitContactData(unitId)
    setBusy(false)
    if (result.success) {
      toast.success("Added to your unit's Contacts and Unit Manager")
      setHidden(true)
      router.refresh()
    } else {
      toast.error("Couldn't apply those details")
    }
  }

  async function handleDismiss() {
    setBusy(true)
    await dismissImportedUnitContactData(unitId)
    setBusy(false)
    setHidden(true)
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardContent className="py-3 px-4 space-y-2">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm text-purple-900 font-medium">
              We found some contact details for your unit from an onboarding document
            </p>
            <ul className="text-xs text-purple-800 space-y-0.5">
              {data.ownerPhone && <li>Your phone: {data.ownerPhone}</li>}
              {data.emergencyContactName && (
                <li>
                  Emergency contact: {data.emergencyContactName}
                  {data.emergencyContactPhone && ` (${data.emergencyContactPhone})`}
                </li>
              )}
              {(data.unitManagerName || data.unitManagerCompany) && (
                <li>
                  Unit manager: {[data.unitManagerName, data.unitManagerCompany].filter(Boolean).join(" / ")}
                  {data.unitManagerEmail && `, ${data.unitManagerEmail}`}
                  {data.unitManagerPhone && `, ${data.unitManagerPhone}`}
                </li>
              )}
            </ul>
            <p className="text-[11px] text-purple-600">Review above, then add these to your unit, or dismiss.</p>
          </div>
          <button
            onClick={handleDismiss}
            disabled={busy}
            className="text-purple-400 hover:text-purple-600 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 pl-6">
          <Button type="button" size="sm" onClick={handleApply} disabled={busy}>
            {busy ? "Adding..." : "Add to my unit"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleDismiss} disabled={busy}>
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
