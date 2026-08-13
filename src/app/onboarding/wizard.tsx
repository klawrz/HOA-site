"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus, Trash2, Copy, CheckCheck, Users, Building2, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addUnit, deleteUnit, completeOnboarding, updateUnitLabel, claimOwnUnit } from "@/app/actions/org"
import { createInvite } from "@/app/actions/invites"
import { BulkAddUnitsDialog } from "@/app/dashboard/account/units/bulk-add-units-dialog"
import { unitDisplayName } from "@/lib/unit-label-format"

type Unit = { id: string; number: string; building: string | null; bedrooms: number | null }
type Invite = { id: string; email: string; role: string; token: string; acceptedAt: Date | null }

const STEPS = ["Configure Units", "Invite Members", "All Set"]

const PRESET_UNIT_LABELS = ["Unit", "Apt.", "Villa", "Condo", "Townhouse", "House", "Suite", "Lot"]
const NONE_VALUE = "__none__"
const CUSTOM_VALUE = "__custom__"

function labelToSelectValue(label: string) {
  if (!label) return NONE_VALUE
  if (PRESET_UNIT_LABELS.includes(label)) return label
  return CUSTOM_VALUE
}

const SUGGESTED_ROLES = [
  { value: "OWNER", label: "Unit Owner", hint: "Required to finish setup" },
  { value: "PROPERTY_MANAGER", label: "Property Manager", hint: "Runs day-to-day operations" },
  { value: "BOARD_MEMBER", label: "Board Member", hint: "Governance & approvals" },
]

export function OnboardingWizard({
  org,
  units,
  invites,
  step,
  baseUrl,
  unitLabel,
  ownedUnit,
}: {
  org: { id: string; name: string }
  units: Unit[]
  invites: Invite[]
  step: number
  baseUrl: string
  unitLabel: string
  ownedUnit: { id: string; number: string } | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState("")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [unitRole, setUnitRole] = useState("")
  const [inviteError, setInviteError] = useState("")
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

  // A self-claimed unit is a confirmed owner on record already - it
  // satisfies the same "at least one owner" requirement completeOnboarding
  // checks server-side, same as an OWNER invite does.
  const hasOwnerOnRecord = invites.some((inv) => inv.role === "OWNER") || !!claimedUnit
  const invitedRoles = new Set(invites.map((inv) => inv.role))

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

  async function handleCreateInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInviteError("")
    const fd = new FormData(e.currentTarget)
    fd.set("role", role)
    try {
      const token = await createInvite(fd)
      copyLink(token)
      ;(e.target as HTMLFormElement).reset()
      setRole("")
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to create invite")
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

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set up {org.name}</h1>
        <p className="text-gray-500 text-sm mb-6">Complete these steps to get your portal running.</p>
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
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
                  {label}
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
            Continue to Invite Members →
          </Button>
          {units.length === 0 && (
            <p className="text-center text-sm text-gray-400">Add at least one unit to continue</p>
          )}
        </div>
      )}

      {/* Step 2: Invites */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Invite members</h2>
              <p className="text-sm text-gray-500">Generate invite links to share with unit owners, managers, and contractors.</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Who to invite</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_ROLES.map((r) => {
                const done = invitedRoles.has(r.value)
                const active = role === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => { setRole(r.value); setUnitRole(r.value) }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-left border transition-colors ${
                      done
                        ? "bg-green-50 border-green-200 text-green-700"
                        : active
                        ? "bg-gray-900 border-gray-900 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {done && <Check className="h-3.5 w-3.5 shrink-0" />}
                    <span>
                      <span className="font-medium">{r.label}</span>
                      <span className={`block text-xs ${done ? "text-green-600" : active ? "text-gray-300" : "text-gray-400"}`}>
                        {done ? "Invited" : r.hint}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleCreateInvite} className="bg-white border rounded-xl p-5 space-y-4">
            <div className="space-y-1">
              <Label>Email address</Label>
              <Input name="email" type="email" placeholder="owner@example.com" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => { setRole(v ?? ""); setUnitRole(v ?? "") }} required>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Unit Owner</SelectItem>
                    <SelectItem value="PROPERTY_MANAGER">Property Manager</SelectItem>
                    <SelectItem value="BOARD_MEMBER">Board Member</SelectItem>
                    <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                    <SelectItem value="RENTER">Renter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(unitRole === "OWNER" || unitRole === "RENTER") && (
                <div className="space-y-1">
                  <Label>Assign to {label || "unit"}</Label>
                  <Select name="unitId">
                    <SelectTrigger><SelectValue placeholder={`Select ${(label || "unit").toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{unitDisplayName(label, u.number)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
            <Button type="submit" className="w-full gap-2" disabled={!role}>
              <Plus className="h-4 w-4" /> Generate Invite Link
            </Button>
          </form>

          {invites.length > 0 && (
            <div className="bg-white border rounded-xl divide-y">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{inv.email}</p>
                    <p className="text-xs text-gray-500">{inv.role.replace("_", " ")} {inv.acceptedAt ? "· Accepted" : "· Pending"}</p>
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
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => goStep(1)} className="flex-1">← Back</Button>
            <Button onClick={() => goStep(3)} disabled={!hasOwnerOnRecord} className="flex-1">Finish Setup →</Button>
          </div>
          {!hasOwnerOnRecord && (
            <p className="text-center text-sm text-gray-400">Invite at least one Unit Owner to continue</p>
          )}
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 3 && (
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
        </div>
      )}
    </div>
  )
}
