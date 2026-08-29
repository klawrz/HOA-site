"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Crown, UserPlus, ArrowUpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { inviteCustodian, promoteToCustodian, stepDownAsCustodian } from "@/app/actions/custodians"

type Member = { id: string; role: string; isBoardMember: boolean; user: { id: string; name: string | null; email: string | null } }

export function CustodiansCard({
  members,
  verificationStatus,
  currentUserId,
}: {
  members: Member[]
  verificationStatus: string
  currentUserId: string
}) {
  const router = useRouter()
  const custodians = members.filter((m) => m.role === "ACCOUNT_OWNER")
  const others = members.filter((m) => m.role !== "ACCOUNT_OWNER")

  const [inviteEmail, setInviteEmail] = useState("")
  const [promoteId, setPromoteId] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setPending(true)
    try {
      await inviteCustodian(inviteEmail)
      toast.success("Custodian invite sent")
      setInviteEmail("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite")
    } finally {
      setPending(false)
    }
  }

  async function handlePromote() {
    if (!promoteId) return
    setError("")
    setPending(true)
    try {
      await promoteToCustodian(promoteId)
      toast.success("Promoted to custodian")
      setPromoteId("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote")
    } finally {
      setPending(false)
    }
  }

  async function handleStepDown() {
    if (!window.confirm("Step down as a custodian of this organization?")) return
    setError("")
    setPending(true)
    try {
      await stepDownAsCustodian()
      toast.success("You've stepped down as a custodian")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to step down")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="bg-white border rounded-xl p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-600" /> Custodians
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {verificationStatus === "VERIFIED"
            ? "The organization owns this workspace, not any one person - a verified org always keeps at least two custodians."
            : "Add a second custodian before requesting verification."}
        </p>
      </div>

      {/* Who holds ultimate authority on this org - called out distinctly
          from the general member/invite list below, which is easy to
          overlook this in among ordinary pending invites. */}
      <div className="flex flex-wrap gap-2">
        {custodians.map((m) => (
          <div key={m.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full pl-2 pr-3 py-1.5">
            <Crown className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-900">{m.user.name}</span>
            {m.isBoardMember && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">BOARD</span>
            )}
            {m.user.id === currentUserId && (
              <button onClick={handleStepDown} disabled={pending} className="text-xs text-amber-700 hover:underline ml-1 disabled:opacity-50">
                Step down
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="pt-3 border-t grid sm:grid-cols-2 gap-3">
        <form onSubmit={handleInvite} className="space-y-1">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <UserPlus className="h-3 w-3" /> Invite a custodian
          </label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="text-sm"
            />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              Invite
            </Button>
          </div>
        </form>

        {others.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <ArrowUpCircle className="h-3 w-3" /> Promote an existing member
            </label>
            <div className="flex gap-2">
              <Select value={promoteId} onValueChange={(v) => setPromoteId(v ?? "")}>
                <SelectTrigger className="text-sm w-full"><SelectValue placeholder="Select a member" /></SelectTrigger>
                <SelectContent>
                  {others.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.user.name} ({m.role.replace(/_/g, " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" variant="outline" onClick={handlePromote} disabled={pending || !promoteId}>
                Promote
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
