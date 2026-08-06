"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, UserPlus, MapPin, IdCard, PartyPopper, Copy, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createOrganizationWithOwner, updateOrgAddressAdmin, updateOrgBillingProfile, autoGenerateUnitsAdmin } from "@/app/actions/platform-admin"
import { convertPMReferral } from "@/app/actions/pm-referrals"

const STEPS = ["Create the Account", "Basic Data", "Account Owner Data", "All Set"]

export function NewOrgWizard({
  baseUrl,
  initialOrgName,
  referralId,
}: {
  baseUrl: string
  initialOrgName?: string
  referralId?: string
}) {
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [usedExistingAccount, setUsedExistingAccount] = useState(false)
  const [unitsGenerated, setUnitsGenerated] = useState(0)

  async function handleCreateAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      const result = await createOrganizationWithOwner({
        orgName: fd.get("orgName") as string,
        ownerName: fd.get("ownerName") as string,
        ownerEmail: fd.get("ownerEmail") as string,
        password: fd.get("password") as string,
        accountNumber: fd.get("accountNumber") as string,
        pricingPlan: fd.get("pricingPlan") as string,
        billingExpiry: fd.get("billingExpiry") as string,
      })
      setOrgId(result.orgId)
      setOrgName(result.orgName)
      setOwnerName(fd.get("ownerName") as string)
      setOwnerEmail(fd.get("ownerEmail") as string)
      setUsedExistingAccount(result.usedExistingAccount)
      if (referralId) await convertPMReferral(referralId, result.orgId)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization")
    } finally {
      setSaving(false)
    }
  }

  async function handleBasicData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!orgId) return
    setError("")
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      await updateOrgAddressAdmin(orgId, fd)
      const unitCountRaw = fd.get("unitCount") as string
      const unitCount = unitCountRaw ? Number(unitCountRaw) : 0
      if (unitCount > 0) {
        const result = await autoGenerateUnitsAdmin(orgId, unitCount)
        setUnitsGenerated(result.created)
      }
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleAccountOwnerData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!orgId) return
    setError("")
    setSaving(true)
    try {
      await updateOrgBillingProfile(orgId, new FormData(e.currentTarget))
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function copyLoginInfo() {
    navigator.clipboard.writeText(
      `${orgName} on HOPE\nLogin: ${baseUrl}/login\nEmail: ${ownerEmail}\n\nSign in and you'll be walked through setting up units and inviting other members.`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div className="flex items-center gap-2 flex-wrap">
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

      {step === 1 && (
        <form onSubmit={handleCreateAccount} className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold">Create the account</h2>
              <p className="text-sm text-gray-500">The org and its Account Owner login, ready to use immediately.</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Organization name</Label>
            <Input name="orgName" placeholder="e.g. Maple Grove HOA" defaultValue={initialOrgName} required />
          </div>
          <div className="space-y-1">
            <Label>Account Owner name</Label>
            <Input name="ownerName" placeholder="Jamie Rivera" required />
          </div>
          <div className="space-y-1">
            <Label>Account Owner email</Label>
            <Input name="ownerEmail" type="email" placeholder="owner@example.com" required />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input name="password" type="password" placeholder="At least 8 characters" required minLength={8} />
            <p className="text-xs text-gray-400">If this email already has a HOPE account, it just gets added as Account Owner here - this password is ignored.</p>
          </div>

          <div className="pt-2 border-t space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Billing</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Account Number</Label>
                <Input name="accountNumber" placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label>Pricing Plan</Label>
                <Input name="pricingPlan" placeholder="$49/mo Standard" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Billing Expiry</Label>
              <Input name="billingExpiry" type="date" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Creating..." : "Create & Continue"}
          </Button>
        </form>
      )}

      {step === 2 && orgId && (
        <form onSubmit={handleBasicData} className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-purple-50 rounded-lg">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold">Basic data</h2>
              <p className="text-sm text-gray-500">{orgName}&apos;s property address - needed on file before the account is complete.</p>
            </div>
          </div>
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

          <div className="pt-2 border-t space-y-1">
            <Label>Number of units</Label>
            <Input name="unitCount" type="number" min={1} max={500} placeholder="Optional - e.g. 24" />
            <p className="text-xs text-gray-400">
              {`If you know the property size, we'll pre-add that many units (just numbered 1, 2, 3...) so ${ownerName || "the Account Owner"} isn't starting from zero. They can rename, edit, or add more anytime - leave this blank to let them add units themselves instead.`}
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        </form>
      )}

      {step === 3 && orgId && (
        <form onSubmit={handleAccountOwnerData} className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-orange-50 rounded-lg">
              <IdCard className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold">Account Owner data</h2>
              <p className="text-sm text-gray-500">
                {ownerName}&apos;s own contact details, plus someone else who can be reached in an emergency -
                needed on file before the account is complete.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input name="accountOwnerName" defaultValue={ownerName} required />
            </div>
            <div className="space-y-1">
              <Label>Role / Title</Label>
              <Input name="accountOwnerTitle" placeholder="e.g. Board President, self-managed Owner" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="accountOwnerEmail" type="email" defaultValue={ownerEmail} required />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="accountOwnerPhone" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Address Line 1</Label>
              <Input name="accountOwnerAddressLine1" required />
            </div>
            <div className="space-y-1">
              <Label>Address Line 2</Label>
              <Input name="accountOwnerAddressLine2" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>City</Label>
              <Input name="accountOwnerCity" required />
            </div>
            <div className="space-y-1">
              <Label>State / Province</Label>
              <Input name="accountOwnerState" />
            </div>
            <div className="space-y-1">
              <Label>Postal Code</Label>
              <Input name="accountOwnerPostalCode" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input name="accountOwnerCountry" required />
          </div>

          <div className="pt-2 border-t space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alternate Contact</h3>
            <p className="text-xs text-gray-400 -mt-2">
              Someone else who can be reached if the Account Owner can&apos;t be - matters for business
              continuity.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input name="altContactName" required />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input name="altContactEmail" type="email" required />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input name="altContactPhone" required />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        </form>
      )}

      {step === 4 && orgId && (
        <div className="bg-white border rounded-xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-green-50 rounded-full">
              <PartyPopper className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{orgName} is ready</h2>
            <p className="text-gray-500 text-sm">
              {usedExistingAccount
                ? <>{ownerEmail} already had a HOPE account - it now has Account Owner access here too, with their existing password.</>
                : <>{ownerEmail} can sign in now with the password you set.</>}
            </p>
          </div>

          <div className="bg-gray-50 border rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-medium text-gray-700">What happens when {ownerName} signs in</p>
            <p className="text-sm text-gray-500">
              {unitsGenerated > 0 ? (
                `We've pre-added ${unitsGenerated} units, so they can go straight to inviting people - at least one Unit Owner is required to finish setup, and they'll see quick options to also invite a Property Manager and Board Members. All optional beyond that one owner invite, and units can be renamed or edited anytime.`
              ) : (
                <>
                  They&apos;ll be dropped straight into a short setup wizard - add their first unit(s), then invite
                  at least one Unit Owner to finish. They&apos;ll also see quick options to invite a Property
                  Manager and Board Members, though only the owner invite is required.
                </>
              )}
            </p>
            <button
              onClick={copyLoginInfo}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 pt-1"
            >
              {copied ? <><CheckCheck className="h-3.5 w-3.5 text-green-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy login info to send {ownerName}</>}
            </button>
          </div>

          <Link href={`/platform-admin/${orgId}`}>
            <Button size="lg" className="px-10">Go to organization</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
