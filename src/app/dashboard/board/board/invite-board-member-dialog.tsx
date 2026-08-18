"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Copy, CheckCheck, UserPlus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createInvite } from "@/app/actions/invites"

export function InviteBoardMemberDialog({ baseUrl }: { baseUrl: string }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    fd.set("role", "BOARD_MEMBER")
    try {
      const token = await createInvite(fd)
      setInviteLink(`${baseUrl}/invite/${token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite")
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success("Link copied")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setInviteLink(null)
          setError("")
        }
      }}
    >
      <DialogTrigger render={<Button className="gap-1.5" />}>
        <UserPlus className="h-4 w-4" /> Invite Board Member
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite a Board Member</DialogTitle>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Invite created - share this link with them to accept.
            </p>
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <p className="text-xs text-gray-700 truncate flex-1">{inviteLink}</p>
              <button onClick={copyLink} className="text-gray-500 hover:text-gray-900 shrink-0">
                {copied ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="member@example.com" required autoFocus />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-gray-400">
              They&apos;ll be invited with Board Member access. Once they accept, add their seat under
              Board Composition below.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
