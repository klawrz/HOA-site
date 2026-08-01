"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Copy } from "lucide-react"
import { createShareLink, revokeShareLink } from "@/app/actions/occupancy"

interface ShareLink {
  id: string
  token: string
  label: string
}

export function ShareLinksPanel({ unitId, links }: { unitId: string; links: ShareLink[] }) {
  const [label, setLabel] = useState("")
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setCreating(true)
    const result = await createShareLink(unitId, label.trim())
    setCreating(false)
    if (result.success) {
      toast.success("Share link created")
      setLabel("")
    } else {
      toast.error(result.error ?? "Failed to create link")
    }
  }

  async function handleRevoke(id: string) {
    setRevokingId(id)
    const result = await revokeShareLink(id)
    setRevokingId(null)
    if (!result.success) toast.error("Failed to revoke")
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/occupancy/${token}`
    navigator.clipboard.writeText(url)
    toast.success("Link copied")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Share With a Contact</CardTitle>
        <p className="text-xs text-gray-400">
          A private, read-only link - no HOPE account needed, e.g. a family member checking dates.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.length === 0 && <p className="text-sm text-gray-400">No share links yet.</p>}
        {links.map((l) => (
          <div key={l.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
            <span className="font-medium">{l.label}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyLink(l.token)}
                className="text-gray-400 hover:text-blue-500 transition-colors"
                title="Copy link"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleRevoke(l.id)}
                disabled={revokingId === l.id}
                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Revoke"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Mom" />
          <Button type="submit" size="sm" disabled={creating || !label.trim()}>
            {creating ? "Creating..." : "+ Add"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
