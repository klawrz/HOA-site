"use client"

import { useState } from "react"
import { Copy, CheckCheck, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createInvite } from "@/app/actions/invites"

type Unit = { id: string; number: string }
type Invite = { id: string; email: string; role: string; token: string; acceptedAt: Date | null }

export function InvitePanel({
  units,
  invites: initialInvites,
  baseUrl,
}: {
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
      const token = await createInvite(fd)
      const email = fd.get("email") as string
      const unitId = fd.get("unitId") as string
      setInvites((prev) => [
        { id: token, email, role, token, acceptedAt: null },
        ...prev,
      ])
      copyLink(token)
      ;(e.target as HTMLFormElement).reset()
      setRole("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-700">Send Invites</h2>
      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 space-y-3">
        <div className="space-y-1">
          <Label>Email</Label>
          <Input name="email" type="email" placeholder="member@example.com" required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v ?? "")}
              required
              items={{
                OWNER: "Unit Owner",
                PROPERTY_MANAGER: "Property Manager",
                BOARD_MEMBER: "Board Member",
                CONTRACTOR: "Contractor",
                RENTER: "Renter",
                UNIT_MANAGER: "Unit Manager",
              }}
            >
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">Unit Owner</SelectItem>
                <SelectItem value="PROPERTY_MANAGER">Property Manager</SelectItem>
                <SelectItem value="BOARD_MEMBER">Board Member</SelectItem>
                <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                <SelectItem value="RENTER">Renter</SelectItem>
                <SelectItem value="UNIT_MANAGER">Unit Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(role === "OWNER" || role === "RENTER") && (
            <div className="space-y-1">
              <Label>Unit</Label>
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
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full gap-2" disabled={!role}>
          <Plus className="h-4 w-4" /> Generate Invite
        </Button>
      </form>

      {invites.length > 0 && (
        <div className="bg-white border rounded-xl divide-y">
          {invites.slice(0, 5).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{inv.email}</p>
                <p className="text-xs text-gray-400">
                  {inv.role.replace(/_/g, " ")} · {inv.acceptedAt ? "Accepted" : "Pending"}
                </p>
              </div>
              {!inv.acceptedAt && (
                <button
                  onClick={() => copyLink(inv.token)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 shrink-0 transition-colors"
                >
                  {copiedToken === inv.token ? (
                    <><CheckCheck className="h-3.5 w-3.5 text-green-600" /> Copied</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy</>
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
