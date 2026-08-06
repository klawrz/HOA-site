"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { approveOrgDeletion, denyOrgDeletion } from "@/app/actions/org-deletion-requests"

export function OrgDeletionBanner({
  requestId,
  orgName,
  canRespond,
  alreadyApprovedByMe,
}: {
  requestId: string
  orgName: string
  canRespond: boolean
  alreadyApprovedByMe: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [denyOpen, setDenyOpen] = useState(false)
  const [reason, setReason] = useState("")

  async function handleApprove() {
    setPending(true)
    try {
      await approveOrgDeletion(requestId)
      toast.success("Approval recorded")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setPending(false)
    }
  }

  async function handleDeny() {
    setPending(true)
    try {
      await denyOrgDeletion(requestId, reason)
      toast.success("Deletion request denied")
      setDenyOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-900">HOPE has requested to permanently delete {orgName}</p>
        <p className="text-xs text-red-700 mt-0.5">
          {alreadyApprovedByMe
            ? "You've approved this. It still needs sign-off from the other required approver before anything happens."
            : canRespond
              ? "This requires approval from both the Account Owner and a Board Member before it happens. Nothing is deleted until then."
              : "Awaiting approval from the Account Owner and a Board Member. Nothing is deleted until then."}
        </p>
        {canRespond && !alreadyApprovedByMe && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-100" onClick={handleApprove} disabled={pending}>
              {pending ? "Working..." : "Approve"}
            </Button>
            <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
              <DialogTrigger render={<Button size="sm" variant="ghost" />}>Deny</DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Deny this deletion request?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-gray-500">This closes the request. HOPE would need to request deletion again separately.</p>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDenyOpen(false)} disabled={pending}>Cancel</Button>
                  <Button onClick={handleDeny} disabled={pending} className="bg-red-600 hover:bg-red-700">
                    {pending ? "Working..." : "Deny Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  )
}
