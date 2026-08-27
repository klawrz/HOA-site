"use client"

import { useState } from "react"
import { Plus, Copy, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createInvite } from "@/app/actions/invites"
import { ImportDocumentsPanel } from "@/app/onboarding/import-documents-panel"

type Invite = { id: string; email: string; token: string; acceptedAt: Date | null }

// Mirrors the onboarding wizard's Property Manager step (upload a contract
// to detect the company's contact info, or invite them directly) - kept
// here too since a custodian setting things up in any order (see the
// sidebar's "any order" reveal logic) may reach PM setup long after the
// wizard, and the wizard itself is only an optional one-time walkthrough.
// This can only invite - the PM's own Company Profile stays PM-only (see
// createOrUpdateCompanyProfile in pm.ts), the same governance boundary the
// wizard already respects.
export function PMSetupPanel({ pmInvites }: { pmInvites: Invite[] }) {
  const [pmEmail, setPmEmail] = useState("")
  const [error, setError] = useState("")
  const [invites, setInvites] = useState(pmInvites)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData()
    fd.set("email", pmEmail)
    fd.set("role", "PROPERTY_MANAGER")
    try {
      const token = await createInvite(fd)
      setInvites((prev) => [{ id: token, email: pmEmail, token, acceptedAt: null }, ...prev])
      copyLink(token)
      setPmEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-gray-700">Invite a Property Manager</h2>
        <p className="text-sm text-gray-500">Upload a management contract to detect their contact info, or invite them directly.</p>
      </div>

      <ImportDocumentsPanel />

      <form onSubmit={handleInvite} className="bg-white border rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <Label>Property Manager email</Label>
          <Input
            value={pmEmail}
            onChange={(e) => setPmEmail(e.target.value)}
            type="email"
            placeholder="pm@example.com"
            required
          />
        </div>
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          After they accept, they&apos;ll fill in their company profile - then a Board Member creates and
          approves the management contract to activate them. Two more steps, but not yours to do.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full gap-2" disabled={!pmEmail}>
          <Plus className="h-4 w-4" /> Generate Invite Link
        </Button>
      </form>

      {invites.length > 0 && (
        <div className="bg-white border rounded-xl divide-y">
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{inv.email}</p>
                <p className="text-xs text-gray-500">{inv.acceptedAt ? "Accepted" : "Pending"}</p>
              </div>
              {!inv.acceptedAt && (
                <button
                  onClick={() => copyLink(inv.token)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 shrink-0 transition-colors"
                >
                  {copiedToken === inv.token ? (
                    <><CheckCheck className="h-3.5 w-3.5 text-green-600" /> Copied</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy Link</>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
