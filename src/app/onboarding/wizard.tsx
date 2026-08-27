"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus, Trash2, Copy, CheckCheck, Users, Building2, PartyPopper, Landmark, UserPlus, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addUnit, deleteUnit, completeOnboarding, updateUnitLabel, claimOwnUnit } from "@/app/actions/org"
import { createInvite } from "@/app/actions/invites"
import {
  upsertPendingOwner,
  removePendingOwner,
  sendPendingOwnerInvite,
  sendAllPendingOwners,
} from "@/app/actions/pending-owners"
import { createBoardPosition, deleteBoardPosition } from "@/app/actions/board-positions"
import { inviteCustodian } from "@/app/actions/custodians"
import { BulkAddUnitsDialog } from "@/app/dashboard/account/units/bulk-add-units-dialog"
import { ImportDocumentsPanel } from "./import-documents-panel"
import { unitDisplayName } from "@/lib/unit-label-format"

type Unit = { id: string; number: string; building: string | null; bedrooms: number | null }
type Invite = { id: string; email: string; role: string; token: string; acceptedAt: Date | null }
type BoardPositionRow = { id: string; title: string; userId: string | null }
type PendingOwnerRow = { id: string; unitId: string; unitNumber: string; name: string | null; email: string | null }

// Mirrors the sidebar's four "Setup X" links (see SETUP_PROGRESS_HREFS in
// components/dashboard/sidebar.tsx) rather than the old coarse 3-step split
// - Owners/Board/PM used to be crammed into one "Setup Members" screen with
// a role-chip picker, which didn't give any of the three room to show their
// own document-import panel or invite list on its own.
const STEPS = ["Units", "Owners", "Board", "PM", "All Set"]

const PRESET_UNIT_LABELS = ["Unit", "Apt.", "Villa", "Condo", "Townhouse", "House", "Suite", "Lot"]
const NONE_VALUE = "__none__"
const CUSTOM_VALUE = "__custom__"

function labelToSelectValue(label: string) {
  if (!label) return NONE_VALUE
  if (PRESET_UNIT_LABELS.includes(label)) return label
  return CUSTOM_VALUE
}

export function OnboardingWizard({
  org,
  units,
  invites,
  step,
  baseUrl,
  unitLabel,
  ownedUnit,
  boardPositions: initialBoardPositions,
  pendingOwners,
}: {
  org: { id: string; name: string }
  units: Unit[]
  invites: Invite[]
  step: number
  baseUrl: string
  unitLabel: string
  ownedUnit: { id: string; number: string } | null
  boardPositions: BoardPositionRow[]
  pendingOwners: PendingOwnerRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [addUnitError, setAddUnitError] = useState("")
  const [completeError, setCompleteError] = useState("")

  const [label, setLabel] = useState(unitLabel)
  const [customLabelMode, setCustomLabelMode] = useState(!!unitLabel && !PRESET_UNIT_LABELS.includes(unitLabel))
  const [customLabelValue, setCustomLabelValue] = useState(customLabelMode ? unitLabel : "")
  const [labelSaving, setLabelSaving] = useState(false)
  const [labelError, setLabelError] = useState("")

  const [claimedUnit, setClaimedUnit] = useState(ownedUnit)
  const [claimError, setClaimError] = useState("")
  const [claiming, setClaiming] = useState(false)

  // Owner invite form (Step 2)
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerUnitId, setOwnerUnitId] = useState("")
  const [ownerInviteError, setOwnerInviteError] = useState("")

  // Pre-declared seats (title only, no userId) are pure scaffolding - the
  // createBoardPosition action already skips any isBoardMember/authority
  // grant when there's no userId, so this can't accidentally hand out
  // governance access before someone real fills the seat.
  const [boardPositions, setBoardPositions] = useState(initialBoardPositions)
  const [seatTitle, setSeatTitle] = useState("")
  const [seatHolderName, setSeatHolderName] = useState("")
  const [seatHolderEmail, setSeatHolderEmail] = useState("")
  const [seatSaving, setSeatSaving] = useState(false)
  const [seatError, setSeatError] = useState("")

  // Board Member invite form (Step 3)
  const [boardEmail, setBoardEmail] = useState("")
  const [boardInviteError, setBoardInviteError] = useState("")

  // Property Manager invite form (Step 4)
  const [pmEmail, setPmEmail] = useState("")
  const [pmInviteError, setPmInviteError] = useState("")

  const [custodianEmail, setCustodianEmail] = useState("")
  const [custodianSaving, setCustodianSaving] = useState(false)
  const [custodianSent, setCustodianSent] = useState(false)
  const [custodianError, setCustodianError] = useState("")

  // A self-claimed unit is a confirmed owner on record already - it
  // satisfies the same "at least one owner" requirement completeOnboarding
  // checks server-side, same as an OWNER invite does. A staged-but-not-sent
  // PendingOwner counts too - the whole point of the roster is that the
  // custodian can finish setup with owners on file but invites not yet sent.
  const ownerInvites = invites.filter((inv) => inv.role === "OWNER")
  const boardInvites = invites.filter((inv) => inv.role === "BOARD_MEMBER")
  const pmInvites = invites.filter((inv) => inv.role === "PROPERTY_MANAGER")
  const hasOwnerOnRecord = ownerInvites.length > 0 || pendingOwners.length > 0 || !!claimedUnit

  const [sendingAllOwners, setSendingAllOwners] = useState(false)
  const [sendingOwnerId, setSendingOwnerId] = useState<string | null>(null)

  async function handleClaimUnit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setClaimError("")
    setClaiming(true)
    try {
      const unit = await claimOwnUnit(new FormData(e.currentTarget))
      setClaimedUnit(unit)
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Failed to claim unit")
    } finally {
      setClaiming(false)
    }
  }

  async function handleAddSeat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSeatError("")
    setSeatSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    const result = await createBoardPosition({
      title: seatTitle,
      holderName: seatHolderName || undefined,
      holderEmail: seatHolderEmail || undefined,
      termStart: today,
    })
    setSeatSaving(false)
    if (result.success) {
      setBoardPositions((prev) => [...prev, { id: crypto.randomUUID(), title: seatTitle, userId: null }])
      setSeatTitle("")
      setSeatHolderName("")
      setSeatHolderEmail("")
      ;(e.target as HTMLFormElement).reset()
    } else {
      setSeatError(result.error ?? "Failed to add seat")
    }
  }

  async function handleRemoveSeat(id: string) {
    setBoardPositions((prev) => prev.filter((p) => p.id !== id))
    await deleteBoardPosition(id)
  }

  async function handleInviteCustodian(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCustodianError("")
    setCustodianSaving(true)
    try {
      await inviteCustodian(custodianEmail)
      setCustodianSent(true)
      setCustodianEmail("")
    } catch (err) {
      setCustodianError(err instanceof Error ? err.message : "Failed to send invite")
    } finally {
      setCustodianSaving(false)
    }
  }

  async function saveLabel(next: string) {
    setLabelError("")
    setLabelSaving(true)
    try {
      await updateUnitLabel(next)
      setLabel(next)
    } catch (err) {
      setLabelError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setLabelSaving(false)
    }
  }

  function handleLabelSelect(v: string | null) {
    if (!v) return
    if (v === NONE_VALUE) {
      setCustomLabelMode(false)
      saveLabel("")
    } else if (v === CUSTOM_VALUE) {
      setCustomLabelMode(true)
    } else {
      setCustomLabelMode(false)
      saveLabel(v)
    }
  }

  function goStep(n: number) {
    router.push(`/onboarding?step=${n}`)
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${baseUrl}/invite/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  async function handleAddUnit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAddUnitError("")
    const fd = new FormData(e.currentTarget)
    try {
      await addUnit(fd)
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setAddUnitError(err instanceof Error ? err.message : "Failed to add unit")
    }
  }

  async function handleAddOwner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setOwnerInviteError("")
    if (!ownerUnitId) {
      setOwnerInviteError("Select a unit")
      return
    }
    try {
      await upsertPendingOwner(ownerUnitId, { email: ownerEmail })
      setOwnerEmail("")
      setOwnerUnitId("")
      router.refresh()
    } catch (err) {
      setOwnerInviteError(err instanceof Error ? err.message : "Failed to add owner")
    }
  }

  async function handleSendOwner(id: string) {
    setSendingOwnerId(id)
    const result = await sendPendingOwnerInvite(id)
    setSendingOwnerId(null)
    if (result.success && result.token) {
      copyLink(result.token)
    } else if (!result.success) {
      setOwnerInviteError(result.error ?? "Failed to send invite")
    }
    router.refresh()
  }

  async function handleRemoveOwner(id: string) {
    await removePendingOwner(id)
    router.refresh()
  }

  async function handleSendAllOwners() {
    setSendingAllOwners(true)
    await sendAllPendingOwners()
    setSendingAllOwners(false)
    router.refresh()
  }

  async function handleInviteBoardMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBoardInviteError("")
    const fd = new FormData()
    fd.set("email", boardEmail)
    fd.set("role", "BOARD_MEMBER")
    try {
      const token = await createInvite(fd)
      copyLink(token)
      setBoardEmail("")
    } catch (err) {
      setBoardInviteError(err instanceof Error ? err.message : "Failed to create invite")
    }
  }

  async function handleInvitePM(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPmInviteError("")
    const fd = new FormData()
    fd.set("email", pmEmail)
    fd.set("role", "PROPERTY_MANAGER")
    try {
      const token = await createInvite(fd)
      copyLink(token)
      setPmEmail("")
    } catch (err) {
      setPmInviteError(err instanceof Error ? err.message : "Failed to create invite")
    }
  }

  async function handleComplete() {
    setCompleteError("")
    startTransition(async () => {
      try {
        await completeOnboarding()
        router.push("/dashboard")
      } catch (err) {
        setCompleteError(err instanceof Error ? err.message : "Failed to complete setup")
      }
    })
  }

  function InviteList({ list, emptyLabel }: { list: Invite[]; emptyLabel: string }) {
    if (list.length === 0) return <p className="text-sm text-gray-400">{emptyLabel}</p>
    return (
      <div className="bg-white border rounded-xl divide-y">
        {list.map((inv) => (
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
    )
  }

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set up {org.name}</h1>
        <p className="text-gray-500 text-sm mb-6">
          Complete these in any order - the sidebar tracks the same steps once you reach the dashboard.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {STEPS.map((stepLabel, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={n} className="flex items-center gap-2">
                <button
                  onClick={() => goStep(n)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active ? "bg-gray-900 text-white" : done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <span>{n}</span>}
                  {stepLabel}
                </button>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-200" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 1: Units */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Configure your units</h2>
              <p className="text-sm text-gray-500">Add each unit in your HOA. You can always add more later.</p>
            </div>
          </div>

          <ImportDocumentsPanel
            onBoardPositionAdded={(pos) => setBoardPositions((prev) => [...prev, pos])}
          />

          {/* Claim-your-own-unit is optional, not a gate - a custodian setting
              up on behalf of the whole HOA without personally owning a unit
              (e.g. a hired PM) skips straight to the bulk/one-at-a-time flow
              below. See claimOwnUnit / requireOwnerAccess. */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
            {claimedUnit ? (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    You&apos;re set up as the owner of {unitDisplayName(label, claimedUnit.number)}
                  </p>
                  <p className="text-sm text-gray-500">
                    You&apos;ll see your own Owner dashboard alongside your Account admin tools.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-medium text-gray-900">Is one of these units yours?</p>
                  <p className="text-sm text-gray-500">
                    Claim your own unit first so you can get your Owner dashboard going right away.
                  </p>
                </div>
                <form onSubmit={handleClaimUnit} className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label>{label ? `${label} Number` : "Number"} *</Label>
                    <Input name="number" placeholder="e.g. 1A, 101, B2" required />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label>Building</Label>
                    <Input name="building" placeholder="e.g. Building A" />
                  </div>
                  <div className="space-y-1">
                    <Label>Bedrooms</Label>
                    <Input name="bedrooms" type="number" min="0" placeholder="2" />
                  </div>
                  <div className="space-y-1">
                    <Label>Bathrooms</Label>
                    <Input name="bathrooms" type="number" step="0.5" min="0" placeholder="1.5" />
                  </div>
                  {claimError && <p className="col-span-2 text-sm text-red-600">{claimError}</p>}
                  <Button type="submit" disabled={claiming} className="col-span-2">
                    {claiming ? "Claiming..." : "This is my unit"}
                  </Button>
                </form>
              </>
            )}
          </div>

          <div className="bg-white border rounded-xl p-4 space-y-2">
            <Label>What do you call a unit here?</Label>
            <div className="flex gap-2">
              <Select value={labelToSelectValue(label)} onValueChange={handleLabelSelect}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No prefix (just numbers)</SelectItem>
                  {PRESET_UNIT_LABELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_VALUE}>Custom...</SelectItem>
                </SelectContent>
              </Select>
              {customLabelMode && (
                <Input
                  value={customLabelValue}
                  onChange={(e) => setCustomLabelValue(e.target.value)}
                  onBlur={() => customLabelValue.trim() && saveLabel(customLabelValue.trim())}
                  placeholder="e.g. Casa, Lote"
                  className="w-40"
                />
              )}
              {labelSaving && <span className="text-xs text-gray-400 self-center">Saving...</span>}
            </div>
            <p className="text-xs text-gray-400">
              Used as the prefix - e.g. &quot;Villa 3&quot;. You can change this anytime from Account &gt; Units.
            </p>
            {labelError && <p className="text-xs text-red-600">{labelError}</p>}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Add one at a time, or in bulk</p>
            <BulkAddUnitsDialog unitLabel={label} />
          </div>

          <form onSubmit={handleAddUnit} className="bg-white border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label>{label ? `${label} Number` : "Number"} *</Label>
                <Input name="number" placeholder="e.g. 1A, 101, B2" required />
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label>Building</Label>
                <Input name="building" placeholder="e.g. Building A" />
              </div>
              <div className="space-y-1">
                <Label>Bedrooms</Label>
                <Input name="bedrooms" type="number" min="0" placeholder="2" />
              </div>
              <div className="space-y-1">
                <Label>Bathrooms</Label>
                <Input name="bathrooms" type="number" step="0.5" min="0" placeholder="1.5" />
              </div>
            </div>
            {addUnitError && <p className="text-sm text-red-600">{addUnitError}</p>}
            <Button type="submit" variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" /> Add Unit
            </Button>
          </form>

          {units.length > 0 && (
            <div className="bg-white border rounded-xl divide-y">
              {units.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium">{unitDisplayName(label, u.number)}</span>
                    {u.building && <span className="text-sm text-gray-500 ml-2">{u.building}</span>}
                    {u.bedrooms && <span className="text-sm text-gray-400 ml-2">· {u.bedrooms}bd</span>}
                  </div>
                  <button
                    onClick={() => deleteUnit(u.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={() => goStep(2)}
            disabled={units.length === 0}
            className="w-full"
          >
            Continue to Owners →
          </Button>
          {units.length === 0 && (
            <p className="text-center text-sm text-gray-400">Add at least one unit to continue</p>
          )}
        </div>
      )}

      {/* Step 2: Owners */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Set up owners</h2>
              <p className="text-sm text-gray-500">Add each unit&apos;s owner - generate an invite link, or import from a document.</p>
            </div>
          </div>

          <ImportDocumentsPanel mode="invites" />

          <form onSubmit={handleAddOwner} className="bg-white border rounded-xl p-5 space-y-4">
            <div className="space-y-1">
              <Label>Assign to {label || "unit"}</Label>
              <Select value={ownerUnitId} onValueChange={(v) => setOwnerUnitId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder={`Select ${(label || "unit").toLowerCase()}`} /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{unitDisplayName(label, u.number)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Email address (optional for now)</Label>
              <Input
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                type="email"
                placeholder="owner@example.com"
              />
            </div>
            {ownerInviteError && <p className="text-sm text-red-600">{ownerInviteError}</p>}
            <Button type="submit" className="w-full gap-2" disabled={!ownerUnitId}>
              <Plus className="h-4 w-4" /> Add to Owner Roster
            </Button>
          </form>

          {pendingOwners.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Owners on file ({pendingOwners.length})</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendAllOwners}
                  disabled={sendingAllOwners || !pendingOwners.some((o) => o.email)}
                >
                  {sendingAllOwners ? "Sending..." : "Send All Invites"}
                </Button>
              </div>
              <div className="bg-white border rounded-xl divide-y">
                {pendingOwners.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {unitDisplayName(label, o.unitNumber)}{o.name ? ` - ${o.name}` : ""}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{o.email || "No email on file yet"}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleSendOwner(o.id)}
                        disabled={!o.email || sendingOwnerId === o.id}
                        className="text-xs text-purple-600 hover:text-purple-800 disabled:text-gray-300 transition-colors"
                      >
                        {sendingOwnerId === o.id ? "Sending..." : "Send Invite"}
                      </button>
                      <button
                        onClick={() => handleRemoveOwner(o.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                Owners are staged here until you send their invite - add everyone now and send whenever you&apos;re ready.
              </p>
            </div>
          )}

          <InviteList list={ownerInvites} emptyLabel="No invites sent yet." />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => goStep(1)} className="flex-1">← Back</Button>
            <Button onClick={() => goStep(3)} disabled={!hasOwnerOnRecord} className="flex-1">Continue to Board →</Button>
          </div>
          {!hasOwnerOnRecord && (
            <p className="text-center text-sm text-gray-400">Add at least one Unit Owner to continue</p>
          )}
        </div>
      )}

      {/* Step 3: Board */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Landmark className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Set up the Board</h2>
              <p className="text-sm text-gray-500">Optional - pre-declare seats and invite Board Members, or skip for now.</p>
            </div>
          </div>

          <ImportDocumentsPanel
            onBoardPositionAdded={(pos) => setBoardPositions((prev) => [...prev, pos])}
          />

          <div className="bg-white border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gray-500" />
              <p className="text-sm font-medium text-gray-700">Board seats (optional)</p>
            </div>
            <p className="text-xs text-gray-400">
              Pre-declare seats like President or Treasurer so the roster exists before anyone's invited - this
              doesn&apos;t grant anyone access, it's just placeholders someone can fill in later.
            </p>
            <form onSubmit={handleAddSeat} className="grid grid-cols-2 gap-2">
              <Input
                value={seatTitle}
                onChange={(e) => setSeatTitle(e.target.value)}
                placeholder="e.g. President, Treasurer"
                required
                className="col-span-2 sm:col-span-1"
              />
              <Input
                value={seatHolderName}
                onChange={(e) => setSeatHolderName(e.target.value)}
                placeholder="Name (optional)"
                className="col-span-2 sm:col-span-1"
              />
              <Input
                value={seatHolderEmail}
                onChange={(e) => setSeatHolderEmail(e.target.value)}
                type="email"
                placeholder="Email (optional)"
                className="col-span-2"
              />
              {seatError && <p className="col-span-2 text-sm text-red-600">{seatError}</p>}
              <Button type="submit" variant="outline" size="sm" disabled={seatSaving || !seatTitle} className="col-span-2 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> {seatSaving ? "Adding..." : "Add Seat"}
              </Button>
            </form>
            {boardPositions.length > 0 && (
              <div className="divide-y border-t">
                {boardPositions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2">
                    <span className="text-sm">{p.title}</span>
                    <button
                      onClick={() => handleRemoveSeat(p.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleInviteBoardMember} className="bg-white border rounded-xl p-5 space-y-4">
            <div className="space-y-1">
              <Label>Invite a Board Member</Label>
              <Input
                value={boardEmail}
                onChange={(e) => setBoardEmail(e.target.value)}
                type="email"
                placeholder="board@example.com"
                required
              />
            </div>
            {boardInviteError && <p className="text-sm text-red-600">{boardInviteError}</p>}
            <Button type="submit" className="w-full gap-2" disabled={!boardEmail}>
              <Plus className="h-4 w-4" /> Generate Invite Link
            </Button>
          </form>

          <InviteList list={boardInvites} emptyLabel="No Board Members invited yet." />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => goStep(2)} className="flex-1">← Back</Button>
            <Button onClick={() => goStep(4)} className="flex-1">Continue to Property Manager →</Button>
          </div>
        </div>
      )}

      {/* Step 4: Property Manager */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Wrench className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Set up the Property Manager</h2>
              <p className="text-sm text-gray-500">
                Optional - upload a management contract to detect their contact info, or invite them directly.
              </p>
            </div>
          </div>

          <ImportDocumentsPanel />

          <form onSubmit={handleInvitePM} className="bg-white border rounded-xl p-5 space-y-4">
            <div className="space-y-1">
              <Label>Invite a Property Manager</Label>
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
            {pmInviteError && <p className="text-sm text-red-600">{pmInviteError}</p>}
            <Button type="submit" className="w-full gap-2" disabled={!pmEmail}>
              <Plus className="h-4 w-4" /> Generate Invite Link
            </Button>
          </form>

          <InviteList list={pmInvites} emptyLabel="No Property Manager invited yet." />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => goStep(3)} className="flex-1">← Back</Button>
            <Button onClick={() => goStep(5)} className="flex-1">Continue to Finish →</Button>
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="p-4 bg-green-50 rounded-full">
                <PartyPopper className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h2>
              <p className="text-gray-500">
                {org.name} is configured with {units.length} {(label || "unit").toLowerCase()}{units.length !== 1 ? "s" : ""} and{" "}
                {invites.length} invite{invites.length !== 1 ? "s" : ""} sent.
              </p>
            </div>
            {completeError && <p className="text-sm text-red-600">{completeError}</p>}
            <Button
              onClick={handleComplete}
              disabled={isPending}
              size="lg"
              className="px-10"
            >
              {isPending ? "Loading..." : "Go to Dashboard"}
            </Button>
            <p className="text-sm text-gray-400">
              Track PM setup, verification, and board roster anytime from{" "}
              <span className="font-medium">Account &gt; Setup Status</span>.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-700" />
              <p className="text-sm font-medium text-amber-900">Invite a second custodian</p>
            </div>
            {custodianSent ? (
              <p className="text-sm text-amber-700">Invite sent.</p>
            ) : (
              <>
                <p className="text-xs text-amber-700">
                  Not required now, but you&apos;ll need one later to verify this workspace and unlock full
                  capabilities.
                </p>
                <form onSubmit={handleInviteCustodian} className="flex gap-2">
                  <Input
                    value={custodianEmail}
                    onChange={(e) => setCustodianEmail(e.target.value)}
                    type="email"
                    placeholder="co-custodian@example.com"
                    required
                    className="flex-1"
                  />
                  <Button type="submit" variant="outline" size="sm" disabled={custodianSaving}>
                    {custodianSaving ? "Sending..." : "Invite"}
                  </Button>
                </form>
                {custodianError && <p className="text-xs text-red-600">{custodianError}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
