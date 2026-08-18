"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { signUpNewOrg } from "@/app/actions/signup"
import { updateOrgAddress, claimOwnUnit, completeOnboarding } from "@/app/actions/org"

const STEPS = ["Create Account", "Basic Data"]

// Step 2 is a genuinely distinct flow per role (not one shared form with
// conditional field requirements) - each role's real priority differs
// enough to warrant it. Only someone claiming to speak for the Board
// plausibly knows (and has authority over) the property's formal
// address/legal identity/adoption status, so only BOARD_OFFICER is asked
// for it. SELF_OWNER's priority is getting their own unit going fast, so
// they claim it directly and skip the onboarding wizard entirely.
// PROPERTY_MANAGER/OTHER have nothing role-specific to collect here and
// go straight into the wizard to configure the property. See
// Organization.boardApprovalStatus for the related "don't assume
// commitment that wasn't given" reasoning.
const ROLE_OPTIONS = [
  { value: "BOARD_OFFICER", label: "Board Member / Officer" },
  { value: "SELF_OWNER", label: "Unit Owner (managing my own unit)" },
  { value: "PROPERTY_MANAGER", label: "Property Manager" },
  { value: "OTHER", label: "Other" },
] as const

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const [orgName, setOrgName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [ownerRole, setOwnerRole] = useState<string>("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [password, setPassword] = useState("")

  const [boardApproval, setBoardApproval] = useState<"NOT_YET_DECIDED" | "BOARD_APPROVED">("NOT_YET_DECIDED")

  const ownerRoleLabel = ROLE_OPTIONS.find((r) => r.value === ownerRole)?.label ?? ""

  async function handleCreateAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      await signUpNewOrg({ orgName, ownerName, ownerTitle: ownerRoleLabel, ownerEmail, password })
      const result = await signIn("credentials", { email: ownerEmail, password, redirect: false })
      if (result?.error) {
        setError("Account created, but signing you in failed - please log in manually.")
        setSaving(false)
        return
      }
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setSaving(false)
    }
  }

  function goToDashboard() {
    router.push("/dashboard")
    router.refresh()
  }

  async function handleBasicData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      await updateOrgAddress(new FormData(e.currentTarget))
      goToDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
      setSaving(false)
    }
  }

  // Claiming a unit already satisfies completeOnboarding()'s requirements
  // (>=1 unit, >=1 owner on record), so a self-managed owner never needs to
  // visit the multi-step onboarding wizard built for a Board/PM configuring
  // a whole property - they go straight to their own dashboard.
  async function handleClaimUnit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      await claimOwnUnit(new FormData(e.currentTarget))
      await completeOnboarding()
      goToDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim unit")
      setSaving(false)
    }
  }

  function goToOnboarding() {
    router.push("/onboarding")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center">
          <Image src="/HOPE-logo.png" alt="HOPE" height={48} width={160} className="object-contain" />
        </Link>

        <div className="flex items-center justify-center gap-2">
          {STEPS.map((label, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={n} className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    active ? "bg-gray-900 text-white" : done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <span>{n}</span>}
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-gray-200" />}
              </div>
            )
          })}
        </div>

        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Create your account</CardTitle>
                <CardDescription>Set up your HOA on HOPE - takes about a minute.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-1">
                    <Label>What is your role?</Label>
                    <Select value={ownerRole} onValueChange={(v) => setOwnerRole(v ?? "")} required>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select your role" /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="orgName">Organization name</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Maple Grove HOA"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ownerName">Your name</Label>
                    <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ownerEmail">Email</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" className="w-full" disabled={saving || !ownerRole}>
                    {saving ? "Creating..." : "Create Account"}
                  </Button>
                </form>
                <p className="text-xs text-gray-500 text-center mt-4">
                  Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
                </p>
              </CardContent>
            </>
          )}

          {step === 2 && ownerRole === "BOARD_OFFICER" && (
            <>
              <CardHeader>
                <CardTitle>Basic data</CardTitle>
                <CardDescription>{orgName}&apos;s property address, so it&apos;s on file.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBasicData} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label>Address Line 1</Label>
                      <Input name="addressLine1" required />
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label>Address Line 2</Label>
                      <Input name="addressLine2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>City</Label>
                      <Input name="city" required />
                    </div>
                    <div className="space-y-1">
                      <Label>State / Province</Label>
                      <Input name="state" />
                    </div>
                    <div className="space-y-1">
                      <Label>Postal Code</Label>
                      <Input name="postalCode" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Country</Label>
                    <Input name="country" required />
                  </div>

                  <div className="pt-2 border-t space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Legal Identity</h3>
                    <div className="space-y-1">
                      <Label>Legal entity name (optional)</Label>
                      <Input name="legalEntityName" placeholder="e.g. Maple Grove Condominium Association, Inc." />
                      <p className="text-xs text-gray-400">
                        Purely for reference - doesn&apos;t imply the HOA or Board has adopted HOPE.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label>Has the Board approved using HOPE?</Label>
                      <input type="hidden" name="boardApprovalStatus" value={boardApproval} />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBoardApproval("NOT_YET_DECIDED")}
                          className={`flex-1 text-sm px-3 py-2 rounded-lg border transition-colors ${
                            boardApproval === "NOT_YET_DECIDED"
                              ? "bg-gray-900 border-gray-900 text-white"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          Not yet decided
                        </button>
                        <button
                          type="button"
                          onClick={() => setBoardApproval("BOARD_APPROVED")}
                          className={`flex-1 text-sm px-3 py-2 rounded-lg border transition-colors ${
                            boardApproval === "BOARD_APPROVED"
                              ? "bg-green-600 border-green-600 text-white"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          Board has approved
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Be honest here - you can be exploring HOPE on your own before the Board has decided.
                        Update this anytime.
                      </p>
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Saving..." : "Finish"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === 2 && ownerRole === "SELF_OWNER" && (
            <>
              <CardHeader>
                <CardTitle>Claim your unit</CardTitle>
                <CardDescription>
                  Which unit is yours? You&apos;ll get your own Owner dashboard right away.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleClaimUnit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label>Unit Number</Label>
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
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Claiming..." : "This is my unit"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === 2 && ownerRole === "PROPERTY_MANAGER" && (
            <>
              <CardHeader>
                <CardTitle>You&apos;re almost there</CardTitle>
                <CardDescription>
                  You&apos;re setting up {orgName}&apos;s portal as its property manager. Next, add its units
                  and invite the Board and unit owners.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full" onClick={goToOnboarding}>Continue</Button>
              </CardContent>
            </>
          )}

          {step === 2 && ownerRole === "OTHER" && (
            <>
              <CardHeader>
                <CardTitle>You&apos;re almost there</CardTitle>
                <CardDescription>
                  Next, you&apos;ll add {orgName}&apos;s units and invite the people who&apos;ll use it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full" onClick={goToOnboarding}>Continue</Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
