"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Copy, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addManualUnitManager,
  assignUnitManager,
  inviteUnitManager,
  removeUnitManager,
  setSelfManaged,
  setUnitManagerGrant,
} from "@/app/actions/unit-profile"
import { UnitManagerArea, UnitManagerLevel } from "@/generated/prisma"
import { SPECIALTY_LABELS } from "@/lib/unit-manager-specialties"

const NO_ACCOUNT_ERROR = "No Unit Manager account found with that email"

const AREAS: UnitManagerArea[] = ["GUESTS", "CLEANING", "TICKETS", "OCCUPANCY"]
const AREA_LABELS: Record<UnitManagerArea, string> = {
  GUESTS: "Guests",
  CLEANING: "Cleaning",
  TICKETS: "Tickets",
  OCCUPANCY: "Occupancy",
}
const LEVEL_ITEMS = { NONE: "No access", VIEW: "View", MANAGE: "Manage" }

interface Grant {
  area: UnitManagerArea
  level: UnitManagerLevel
}

interface ManagerAssignment {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  notes: string | null
  hasAccount: boolean
  grants: Grant[]
}

function ManagerGrantRow({
  assignmentId,
  grants,
}: {
  assignmentId: string
  grants: Grant[]
}) {
  const [current, setCurrent] = useState(grants)

  function levelFor(area: UnitManagerArea): "NONE" | UnitManagerLevel {
    return current.find((g) => g.area === area)?.level ?? "NONE"
  }

  async function handleChange(area: UnitManagerArea, value: string | null) {
    const level = value === "NONE" || !value ? null : (value as UnitManagerLevel)
    setCurrent((prev) => {
      const rest = prev.filter((g) => g.area !== area)
      return level ? [...rest, { area, level }] : rest
    })
    const result = await setUnitManagerGrant(assignmentId, area, level)
    if (!result.success) toast.error("Failed to update access")
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
      {AREAS.map((area) => (
        <div key={area} className="space-y-1">
          <label className="text-xs text-gray-400">{AREA_LABELS[area]}</label>
          <Select
            value={levelFor(area)}
            onValueChange={(v) => handleChange(area, v)}
            items={LEVEL_ITEMS}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No access</SelectItem>
              <SelectItem value="VIEW">View</SelectItem>
              <SelectItem value="MANAGE">Manage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}

interface DirectoryEntry {
  name: string | null
  email: string
  company: string | null
  headline: string | null
  bio: string | null
  phone: string | null
  yearsExperience: number | null
  specialties: UnitManagerArea[]
}

export function UnitManagers({
  unitId,
  managers,
  directory = [],
  selfManaged: initialSelfManaged,
}: {
  unitId: string
  managers: ManagerAssignment[]
  directory?: DirectoryEntry[]
  selfManaged: boolean
}) {
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [noAccountFor, setNoAccountFor] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selfManaged, setSelfManagedState] = useState(initialSelfManaged)
  const [savingSelfManaged, setSavingSelfManaged] = useState(false)
  const [mode, setMode] = useState<"account" | "manual">("account")
  const [manualName, setManualName] = useState("")
  const [manualPhone, setManualPhone] = useState("")
  const [manualEmail, setManualEmail] = useState("")
  const [manualNotes, setManualNotes] = useState("")

  async function handleSelfManagedToggle(checked: boolean) {
    setSelfManagedState(checked)
    setSavingSelfManaged(true)
    const result = await setSelfManaged(unitId, checked)
    setSavingSelfManaged(false)
    if (!result.success) {
      setSelfManagedState(!checked)
      toast.error("Failed to update")
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setNoAccountFor(null)
    const result = await assignUnitManager(unitId, email)
    setSaving(false)
    if (result.success) {
      toast.success("Unit Manager assigned")
      setEmail("")
      setShowAssignForm(false)
    } else if (result.error === NO_ACCOUNT_ERROR) {
      setNoAccountFor(email)
    } else {
      toast.error(result.error ?? "Failed to assign Unit Manager")
    }
  }

  async function handleAssignDirect(candidateEmail: string) {
    setSaving(true)
    const result = await assignUnitManager(unitId, candidateEmail)
    setSaving(false)
    if (result.success) {
      toast.success("Unit Manager assigned")
      setShowAssignForm(false)
    } else {
      toast.error(result.error ?? "Failed to assign Unit Manager")
    }
  }

  async function handleInvite() {
    setSaving(true)
    const result = await inviteUnitManager(unitId, email)
    setSaving(false)
    if (result.success && result.token) {
      const link = `${window.location.origin}/invite/${result.token}`
      setInviteLink(link)
      navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Invite created and link copied")
    } else {
      toast.error(result.error ?? "Failed to create invite")
    }
  }

  function resetInviteState() {
    setNoAccountFor(null)
    setInviteLink(null)
    setEmail("")
    setShowAssignForm(false)
    setMode("account")
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await addManualUnitManager(unitId, {
      name: manualName,
      phone: manualPhone || undefined,
      email: manualEmail || undefined,
      notes: manualNotes || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Unit Manager added")
      setManualName("")
      setManualPhone("")
      setManualEmail("")
      setManualNotes("")
      setShowAssignForm(false)
      setMode("account")
    } else {
      toast.error(result.error ?? "Failed to add Unit Manager")
    }
  }

  async function handleRemove(assignmentId: string) {
    setRemovingId(assignmentId)
    const result = await removeUnitManager(assignmentId)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove Unit Manager")
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-gray-900"
          checked={selfManaged}
          disabled={savingSelfManaged}
          onChange={(e) => handleSelfManagedToggle(e.target.checked)}
        />
        I manage this unit myself (no Unit Manager)
      </label>

      {managers.map((m) => (
        <div key={m.id} className="border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{m.name ?? m.email}</p>
                {!m.hasAccount && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                    No HOPE login
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {[m.email, m.phone].filter(Boolean).join(" · ")}
              </p>
              {m.notes && <p className="text-xs text-gray-400 mt-0.5">{m.notes}</p>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRemove(m.id)}
              disabled={removingId === m.id}
            >
              {removingId === m.id ? "Removing..." : "Remove"}
            </Button>
          </div>
          {m.hasAccount ? (
            <ManagerGrantRow assignmentId={m.id} grants={m.grants} />
          ) : (
            <p className="text-xs text-gray-400 mt-2">
              Contact info only - no HOPE login, so no app access to grant.
            </p>
          )}
        </div>
      ))}

      {managers.length === 0 && (
        <p className="text-sm text-gray-500">No Unit Manager assigned yet.</p>
      )}

      {!showAssignForm ? (
        <Button variant="outline" size="sm" onClick={() => setShowAssignForm(true)}>
          + Delegate a Unit Manager
        </Button>
      ) : inviteLink ? (
        <div className="pt-2 border-t space-y-2">
          <p className="text-sm text-gray-700">
            Invite created for <span className="font-medium">{email}</span>. Send them this link -
            once they accept, assign them here.
          </p>
          <div className="flex items-center gap-2">
            <Input value={inviteLink} readOnly className="text-xs" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(inviteLink)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="shrink-0 gap-1"
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={resetInviteState}>
            Done
          </Button>
        </div>
      ) : (
        <div className="pt-2 border-t space-y-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
            <button
              type="button"
              onClick={() => setMode("account")}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                mode === "account" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              Invite / assign an account
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                mode === "manual" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              Just enter their details
            </button>
          </div>

          {mode === "manual" ? (
            <form onSubmit={handleAddManual} className="space-y-2">
              <p className="text-xs text-gray-400">
                No HOPE login for this person - just keep their contact info on file.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email (optional)</Label>
                <Input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="h-16 resize-none"
                  placeholder="e.g. covers cleaning and guest check-in"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving || !manualName}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAssignForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              {directory.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Manager Directory</label>
                  <div className="space-y-2">
                    {directory.map((d) => (
                      <div key={d.email} className="border rounded-lg p-2.5 text-sm space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">
                              {d.name ?? d.email}
                              {d.company && <span className="text-gray-400 font-normal"> · {d.company}</span>}
                            </p>
                            {d.headline && <p className="text-xs text-gray-600 mt-0.5">{d.headline}</p>}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="shrink-0"
                            disabled={saving}
                            onClick={() => handleAssignDirect(d.email)}
                          >
                            Assign
                          </Button>
                        </div>
                        {d.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {d.specialties.map((s) => (
                              <span
                                key={s}
                                className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-teal-50 text-teal-700"
                              >
                                {SPECIALTY_LABELS[s]}
                              </span>
                            ))}
                          </div>
                        )}
                        {d.bio && <p className="text-xs text-gray-500">{d.bio}</p>}
                        <p className="text-xs text-gray-400">
                          {[d.email, d.phone, d.yearsExperience ? `${d.yearsExperience} yrs experience` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <form onSubmit={handleAssign} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium">Or assign by email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setNoAccountFor(null)
                    }}
                    placeholder="Unit Manager's email"
                    required
                  />
                </div>
                <Button type="submit" disabled={saving || !email}>
                  {saving ? "Assigning..." : "Assign"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowAssignForm(false)}>
                  Cancel
                </Button>
              </form>
              {noAccountFor === email ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm space-y-1.5">
                  <p className="text-blue-900">
                    No HOPE account exists for {email} yet. Send them an invite to join as Unit Manager
                    for this unit, or just save their contact info instead.
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleInvite} disabled={saving}>
                      {saving ? "Sending..." : "Send Invite"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setManualEmail(email)
                        setMode("manual")
                      }}
                    >
                      Just save contact info
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Know someone who doesn&apos;t have a HOPE account yet? Enter their email and Assign - we&apos;ll
                  offer to invite them.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
