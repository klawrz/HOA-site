"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ShieldAlert, ShieldOff, Trash2, Clock, CheckCircle2, XCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { suspendOrganization, unsuspendOrganization } from "@/app/actions/platform-admin"
import { requestOrgDeletion, cancelOrgDeletionRequest } from "@/app/actions/org-deletion-requests"

type DeletionRequest = {
  id: string
  status: "PENDING" | "APPROVED" | "DENIED" | "COMPLETED"
  requestedAt: Date
  accountOwnerApprovedByName: string | null
  accountOwnerApprovedAt: Date | null
  boardMemberApprovedByName: string | null
  boardMemberApprovedAt: Date | null
  deniedByName: string | null
  deniedAt: Date | null
  denialReason: string | null
  backupFileUrl: string | null
}

export function DangerZone({
  orgId,
  orgName,
  suspended,
  latestDeletionRequest,
}: {
  orgId: string
  orgName: string
  suspended: boolean
  latestDeletionRequest: DeletionRequest | null
}) {
  const isPending = latestDeletionRequest?.status === "PENDING"
  const router = useRouter()
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmName, setConfirmName] = useState("")
  const [pending, setPending] = useState(false)

  async function handleSuspendToggle() {
    setPending(true)
    try {
      if (suspended) {
        await unsuspendOrganization(orgId)
        toast.success(`${orgName} unsuspended`)
      } else {
        await suspendOrganization(orgId)
        toast.success(`${orgName} suspended`)
      }
      setSuspendOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setPending(false)
    }
  }

  async function handleRequestDeletion() {
    setPending(true)
    try {
      await requestOrgDeletion(orgId, confirmName)
      toast.success("Deletion requested - awaiting Account Owner and Board Member approval")
      setDeleteOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setPending(false)
    }
  }

  async function handleCancelRequest() {
    if (!latestDeletionRequest) return
    setPending(true)
    try {
      await cancelOrgDeletionRequest(latestDeletionRequest.id)
      toast.success("Deletion request withdrawn")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="border border-red-200 rounded-xl p-5 space-y-4 bg-red-50/30">
      <h2 className="font-semibold text-red-900">Danger Zone</h2>

      <div className="flex items-center justify-between gap-4 bg-white border rounded-lg p-4">
        <div>
          <p className="text-sm font-medium">{suspended ? "Unsuspend this organization" : "Suspend this organization"}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {suspended
              ? "Restores dashboard access for every member. No data was affected."
              : "Locks every member (including the Account Owner) out of the dashboard. Reversible - no data is touched."}
          </p>
        </div>
        <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
          <DialogTrigger
            render={<Button variant="outline" className={suspended ? "" : "text-orange-700 border-orange-300 hover:bg-orange-50"} />}
          >
            {suspended ? <ShieldOff className="h-4 w-4 mr-1.5" /> : <ShieldAlert className="h-4 w-4 mr-1.5" />}
            {suspended ? "Unsuspend" : "Suspend"}
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{suspended ? `Unsuspend ${orgName}?` : `Suspend ${orgName}?`}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500">
              {suspended
                ? "Every member will be able to sign in and use the dashboard again."
                : "Every member, including the Account Owner, will be locked out immediately. You can undo this at any time."}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSuspendOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                onClick={handleSuspendToggle}
                disabled={pending}
                className={suspended ? "" : "bg-orange-600 hover:bg-orange-700"}
              >
                {pending ? "Working..." : suspended ? "Yes, unsuspend" : "Yes, suspend"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete this organization</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanently deletes {orgName} and everything on file. As a business-continuity safeguard, this
              requires approval from both the Account Owner and a Board Member before it happens - a full
              backup is generated automatically the moment it&apos;s approved.
            </p>
          </div>
          {!isPending && (
            <Dialog
              open={deleteOpen}
              onOpenChange={(open) => {
                setDeleteOpen(open)
                if (!open) setConfirmName("")
              }}
            >
              <DialogTrigger render={<Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 shrink-0" />}>
                <Trash2 className="h-4 w-4 mr-1.5" /> Request Deletion
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-red-700">Request deletion of {orgName}?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-gray-500">
                  This does not delete anything yet - it sends a request to {orgName}&apos;s Account Owner and
                  Board Members. Only once both an Account Owner and a Board Member approve does the org
                  actually get deleted (with a full backup saved first). Type the organization name to confirm.
                </p>
                <div className="space-y-1">
                  <Label>Type &quot;{orgName}&quot; to confirm</Label>
                  <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={orgName} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRequestDeletion}
                    disabled={pending || confirmName.trim() !== orgName}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {pending ? "Requesting..." : "Send Deletion Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {latestDeletionRequest && latestDeletionRequest.status === "PENDING" && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-orange-700">
              <Clock className="h-4 w-4" /> Deletion requested - awaiting approval
            </div>
            <div className="text-xs text-gray-500 space-y-1 pl-5.5">
              <p className="flex items-center gap-1.5">
                {latestDeletionRequest.accountOwnerApprovedAt ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-gray-300" />
                )}
                Account Owner:{" "}
                {latestDeletionRequest.accountOwnerApprovedAt
                  ? `approved by ${latestDeletionRequest.accountOwnerApprovedByName ?? "them"}`
                  : "waiting"}
              </p>
              <p className="flex items-center gap-1.5">
                {latestDeletionRequest.boardMemberApprovedAt ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-gray-300" />
                )}
                Board Member:{" "}
                {latestDeletionRequest.boardMemberApprovedAt
                  ? `approved by ${latestDeletionRequest.boardMemberApprovedByName ?? "them"}`
                  : "waiting"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCancelRequest} disabled={pending}>
              Withdraw Request
            </Button>
          </div>
        )}

        {latestDeletionRequest && latestDeletionRequest.status === "DENIED" && (
          <div className="border-t pt-3 text-sm text-gray-600 flex items-start gap-1.5">
            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>
              Denied by {latestDeletionRequest.deniedByName ?? "a member"}
              {latestDeletionRequest.denialReason ? `: "${latestDeletionRequest.denialReason}"` : "."}
            </span>
          </div>
        )}

        {latestDeletionRequest && latestDeletionRequest.status === "COMPLETED" && (
          <div className="border-t pt-3 text-sm text-gray-600 space-y-1">
            <p>This organization was deleted.</p>
            {latestDeletionRequest.backupFileUrl && (
              <a
                href={latestDeletionRequest.backupFileUrl}
                className="text-blue-600 hover:underline flex items-center gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" /> Download the full backup
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
