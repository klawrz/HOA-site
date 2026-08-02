"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Copy, CheckCheck, Plus, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { sendOrgInvite, revokeOrgInvite, quickAcceptInvite } from "@/app/actions/platform-admin"

type Unit = { id: string; number: string }
type Invite = { id: string; email: string; role: string; token: string; acceptedAt: Date | null }

const roleOptions: Record<string, string> = {
  ACCOUNT_OWNER: "Account Owner",
  OWNER: "Unit Owner",
  RENTER: "Renter",
  PROPERTY_MANAGER: "Property Manager",
  CONTRACTOR: "Contractor",
  BOARD_MEMBER: "Board Member",
  UNIT_MANAGER: "Unit Manager",
}

export function OrgInvitePanel({
  orgId,
  units,
  invites: initialInvites,
  baseUrl,
}: {
  orgId: string
  units: Unit[]
  invites: Invite[]
  baseUrl: string
}) {
  const [role, setRole] = useState("")
  const [error, setError] = useState("")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [invites, setInvites] = useState(initialInvites)

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${baseUrl}/invite/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData(e.currentTarget)
    fd.set("role", role)
    try {
      const email = fd.get("email") as string
      const { id, token } = await sendOrgInvite(orgId, fd)
      setInvites((prev) => [{ id, email, role, token, acceptedAt: null }, ...prev])
      copyLink(token)
      ;(e.target as HTMLFormElement).reset()
      setRole("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    }
  }

  async function handleRevoke(inviteId: string) {
    await revokeOrgInvite(inviteId, orgId)
    setInvites((prev) => prev.filter((i) => i.id !== inviteId))
  }

  async function handleQuickAccept(inv: Invite) {
    try {
      const result = await quickAcceptInvite(inv.id, orgId)
      setInvites((prev) => prev.map((i) => (i.id === inv.id ? { ...i, acceptedAt: new Date() } : i)))
      toast.success(
        result.password
          ? `Account created - log in as ${inv.email} / ${result.password}`
          : `${inv.email} now has a membership in this org - log in and pick it from the org list`,
        { duration: 8000 }
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-gray-700">Invites</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          No live email delivery yet - copy a link to share it yourself, or use Quick accept to
          skip straight to a working login for testing.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input name="email" type="email" placeholder="member@example.com" required />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? "")} required>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                {Object.entries(roleOptions).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {(role === "OWNER" || role === "RENTER") && units.length > 0 && (
          <div className="space-y-1">
            <Label>Unit (optional)</Label>
            <Select name="unitId">
              <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>Unit {u.number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="gap-2" disabled={!role}>
          <Plus className="h-4 w-4" /> Generate Invite
        </Button>
      </form>

      {invites.length > 0 && (
        <div className="bg-white border rounded-xl divide-y">
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{inv.email}</p>
                <p className="text-xs text-gray-400">
                  {inv.role.replace(/_/g, " ")} · {inv.acceptedAt ? "Accepted" : "Pending"}
                </p>
              </div>
              {!inv.acceptedAt && (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {copiedToken === inv.token ? (
                      <><CheckCheck className="h-3.5 w-3.5 text-green-600" /> Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </button>
                  <button
                    onClick={() => handleQuickAccept(inv)}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition-colors"
                    title="Dev only - simulates the recipient accepting the invite"
                  >
                    <Zap className="h-3.5 w-3.5" /> Quick accept
                  </button>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Revoke
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
