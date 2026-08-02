"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus, Trash2, Copy, CheckCheck, Users, Building2, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addUnit, deleteUnit, completeOnboarding } from "@/app/actions/org"
import { createInvite } from "@/app/actions/invites"

type Unit = { id: string; number: string; building: string | null; bedrooms: number | null }
type Invite = { id: string; email: string; role: string; token: string; acceptedAt: Date | null }

const STEPS = ["Configure Units", "Invite Members", "All Set"]

export function OnboardingWizard({
  org,
  units,
  invites,
  step,
  baseUrl,
  unitLabel,
}: {
  org: { id: string; name: string }
  units: Unit[]
  invites: Invite[]
  step: number
  baseUrl: string
  unitLabel: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState("")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [unitRole, setUnitRole] = useState("")
  const [inviteError, setInviteError] = useState("")
  const [addUnitError, setAddUnitError] = useState("")

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
    startTransition(async () => {
      await completeOnboarding()
      router.push("/dashboard")
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

          <form onSubmit={handleAddUnit} className="bg-white border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label>{unitLabel} Number *</Label>
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
                    <span className="font-medium">{unitLabel} {u.number}</span>
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
                  <Label>Assign to {unitLabel}</Label>
                  <Select name="unitId">
                    <SelectTrigger><SelectValue placeholder={`Select ${unitLabel.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{unitLabel} {u.number}</SelectItem>
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
            <Button onClick={() => goStep(3)} className="flex-1">Finish Setup →</Button>
          </div>
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
              {org.name} is configured with {units.length} {unitLabel.toLowerCase()}{units.length !== 1 ? "s" : ""} and{" "}
              {invites.length} invite{invites.length !== 1 ? "s" : ""} sent.
            </p>
          </div>
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
