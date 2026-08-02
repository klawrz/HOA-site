"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { createOrganization } from "@/app/actions/platform-admin"

export function NewOrgForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const fd = new FormData(e.currentTarget)
      const { orgId, inviteToken } = await createOrganization(fd)
      setOrgId(orgId)
      setInviteLink(`${window.location.origin}/invite/${inviteToken}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization")
    } finally {
      setLoading(false)
    }
  }

  if (inviteLink) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm text-gray-700">Organization created. Send this invite link to the Account Owner:</p>
          <Input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(inviteLink)}>
              Copy link
            </Button>
            <Button variant="outline" onClick={() => router.push(orgId ? `/platform-admin/${orgId}` : "/platform-admin")}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" name="name" placeholder="Willow Creek HOA" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ownerEmail">Initial Account Owner email</Label>
            <Input id="ownerEmail" name="ownerEmail" type="email" placeholder="owner@example.com" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
