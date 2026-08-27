"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Sparkles, Loader2, FileText, Wrench, DollarSign, Trash2, Mail, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { extractSetupDocument, ExtractedSetupFields } from "@/app/actions/setup-import"
import { updateOrgAddress, updateOrgAccountHolderData, bulkAddUnits } from "@/app/actions/org"
import { createBoardPosition } from "@/app/actions/board-positions"
import { createInvite } from "@/app/actions/invites"
import { upsertPendingOwnersByUnitNumber } from "@/app/actions/pending-owners"
import { createDocument } from "@/app/actions/documents"

const CATEGORY_LABELS: Record<string, string> = {
  MEETING_MINUTES: "Meeting Minutes",
  BYLAWS: "Bylaws",
  INSURANCE: "Insurance",
  RESOLUTION: "Resolution",
  CONTRACT: "Contract",
  FINANCIAL: "Financial",
  POLICY: "Policy",
  OTHER: "Other",
}

type OrgFields = {
  legalEntityName: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  accountOwnerName: string
  accountOwnerTitle: string
  accountOwnerEmail: string
  accountOwnerPhone: string
}

const EMPTY_ORG_FIELDS: OrgFields = {
  legalEntityName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  accountOwnerName: "",
  accountOwnerTitle: "",
  accountOwnerEmail: "",
  accountOwnerPhone: "",
}

function mergeOrgFields(prev: OrgFields, next: ExtractedSetupFields): OrgFields {
  const pick = (existing: string, incoming: string | null) => existing || incoming || ""
  return {
    legalEntityName: pick(prev.legalEntityName, next.legalEntityName),
    addressLine1: pick(prev.addressLine1, next.addressLine1),
    addressLine2: pick(prev.addressLine2, next.addressLine2),
    city: pick(prev.city, next.city),
    state: pick(prev.state, next.state),
    postalCode: pick(prev.postalCode, next.postalCode),
    country: pick(prev.country, next.country),
    accountOwnerName: pick(prev.accountOwnerName, next.accountOwnerName),
    accountOwnerTitle: pick(prev.accountOwnerTitle, next.accountOwnerTitle),
    accountOwnerEmail: pick(prev.accountOwnerEmail, next.accountOwnerEmail),
    accountOwnerPhone: pick(prev.accountOwnerPhone, next.accountOwnerPhone),
  }
}

type PendingUnit = { number: string; building: string | null }
type PendingSeat = { title: string; holderName: string | null; holderEmail: string | null; termStart: string | null }
type PendingOwner = {
  unitNumber: string
  name: string | null
  email: string
  phone: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  unitManagerName: string | null
  unitManagerCompany: string | null
  unitManagerEmail: string | null
  unitManagerPhone: string | null
}

const UPLOAD_HINT = "Upload PDF, PNG, JPG, or CSV - review everything before it's applied."

export function ImportDocumentsPanel({
  mode = "units",
  onBoardPositionAdded,
}: {
  // "units": org identity/address, units, board seats, PM/budget summaries
  // (wizard Step 1). "invites": an owner/contact roster only (wizard Step
  // 2) - same upload+extract action, a narrower review surface and a
  // different apply target (the shared owner roster, not org records).
  mode?: "units" | "invites"
  onBoardPositionAdded?: (pos: { id: string; title: string; userId: string | null }) => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [extracting, setExtracting] = useState(false)
  const [hasExtracted, setHasExtracted] = useState(false)

  const [orgFields, setOrgFields] = useState<OrgFields>(EMPTY_ORG_FIELDS)
  const [pendingUnits, setPendingUnits] = useState<PendingUnit[]>([])
  const [pendingSeats, setPendingSeats] = useState<PendingSeat[]>([])
  const [pendingOwners, setPendingOwners] = useState<PendingOwner[]>([])
  const [pmCompany, setPmCompany] = useState<ExtractedSetupFields["pmCompany"]>(null)
  const [pmInviteEmail, setPmInviteEmail] = useState("")
  const [pmInviting, setPmInviting] = useState(false)
  const [pmInvited, setPmInvited] = useState(false)
  const [budgetLineItems, setBudgetLineItems] = useState<ExtractedSetupFields["budgetLineItems"]>([])

  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [rosterResults, setRosterResults] = useState<
    { unitNumber: string; success: boolean; error?: string }[] | null
  >(null)

  async function handleFilesSelected() {
    const files = fileInputRef.current?.files
    if (!files || files.length === 0) return
    setExtracting(true)
    let anySuccess = false
    // A server action can throw outright rather than resolving (e.g. a
    // file over Next's server-action body-size limit rejects before the
    // action's own code - and its try/catch - ever runs) - catching per
    // file, and clearing `extracting` in a finally below, means one bad
    // upload reports an error instead of leaving the panel stuck on
    // "Reading document(s)..." forever.
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData()
        fd.set("file", file)
        const result = await extractSetupDocument(fd)
        if (!result.success) {
          toast.error(`${file.name}: ${result.error}`)
          continue
        }
        anySuccess = true
        const { fields } = result

      // Keep the original on file, filed under the category Claude read
      // off it - extraction alone would otherwise read the document once
      // and then discard it, losing the source a Board Member or PM might
      // need to refer back to later. Recordkeeping, not a data mutation
      // with governance stakes, so this fires unconditionally rather than
      // waiting on the Apply/Send step below.
      const docForm = new FormData()
      docForm.set("file", file)
      docForm.set("title", file.name)
      docForm.set("category", fields.documentCategory)
      const docResult = await createDocument(docForm)
      if (docResult.success) {
        toast.success(`Saved to Documents as ${CATEGORY_LABELS[fields.documentCategory] ?? fields.documentCategory}`)
      }

      if (mode === "invites") {
        // Show every owner row with a unit number, even ones the document
        // gave no email for - a roster commonly has phone numbers but not
        // emails for most units (e.g. only one specific owner used email as
        // their contact method). Dropping those rows would silently lose
        // real names/phone/unit-manager detail the custodian may still
        // want, and the custodian often knows an email the document didn't
        // state (their own, for one). The email field starts blank and is
        // editable; only rows with an email actually get invited.
        //
        // A unit already in the list (from an earlier upload this same
        // session) gets merged, not skipped - a follow-up document is
        // exactly how a missing email gets filled in (e.g. a fuller roster
        // arrives after the first pass only had phone numbers). Existing
        // non-empty values win over the new upload's, so a value the
        // custodian already typed in by hand is never clobbered by a
        // second, possibly less complete, document.
        if (fields.owners.length > 0) {
          setPendingOwners((prev) => {
            const byUnit = new Map(prev.map((o) => [o.unitNumber.toLowerCase(), o] as const))
            for (const o of fields.owners) {
              const key = o.unitNumber.toLowerCase()
              const existing = byUnit.get(key)
              if (!existing) {
                byUnit.set(key, {
                  unitNumber: o.unitNumber,
                  name: o.name,
                  email: o.email ?? "",
                  phone: o.phone,
                  emergencyContactName: o.emergencyContactName,
                  emergencyContactPhone: o.emergencyContactPhone,
                  unitManagerName: o.unitManagerName,
                  unitManagerCompany: o.unitManagerCompany,
                  unitManagerEmail: o.unitManagerEmail,
                  unitManagerPhone: o.unitManagerPhone,
                })
              } else {
                byUnit.set(key, {
                  ...existing,
                  name: existing.name ?? o.name,
                  email: existing.email.trim() ? existing.email : o.email ?? "",
                  phone: existing.phone ?? o.phone,
                  emergencyContactName: existing.emergencyContactName ?? o.emergencyContactName,
                  emergencyContactPhone: existing.emergencyContactPhone ?? o.emergencyContactPhone,
                  unitManagerName: existing.unitManagerName ?? o.unitManagerName,
                  unitManagerCompany: existing.unitManagerCompany ?? o.unitManagerCompany,
                  unitManagerEmail: existing.unitManagerEmail ?? o.unitManagerEmail,
                  unitManagerPhone: existing.unitManagerPhone ?? o.unitManagerPhone,
                })
              }
            }
            return Array.from(byUnit.values())
          })
        }
      } else {
        setOrgFields((prev) => mergeOrgFields(prev, fields))
        if (fields.units.length > 0) {
          setPendingUnits((prev) => {
            const existing = new Set(prev.map((u) => u.number))
            return [...prev, ...fields.units.filter((u) => !existing.has(u.number))]
          })
        }
        if (fields.boardPositions.length > 0) {
          setPendingSeats((prev) => {
            const existing = new Set(prev.map((s) => s.title.toLowerCase()))
            return [...prev, ...fields.boardPositions.filter((s) => !existing.has(s.title.toLowerCase()))]
          })
        }
        if (fields.budgetLineItems.length > 0) {
          setBudgetLineItems((prev) => [...prev, ...fields.budgetLineItems])
        }
      }

      // Not gated to "units" mode - a PM contract is just as likely to be
      // uploaded from the Setup Members step (where "Property Manager" is
      // one of the roles being invited) as from Configure Units, so this
      // needs to surface regardless of which panel instance the file lands
      // on.
        if (fields.pmCompany) {
          setPmCompany(fields.pmCompany)
          setPmInviteEmail((prev) => prev || fields.pmCompany?.email || "")
        }
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "Failed to read that file"}`)
      }
    }
    setExtracting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (anySuccess) {
      setHasExtracted(true)
      toast.success("Details extracted - review before applying")
    }
  }

  function updateOrgField(field: keyof OrgFields, value: string) {
    setOrgFields((prev) => ({ ...prev, [field]: value }))
  }

  // The PM's own company profile can only be created by the PM themselves
  // (see createOrUpdateCompanyProfile in pm.ts) - a custodian filling that
  // in on their behalf would be the exact conflict-of-interest HOPE keeps
  // that action PM-only to avoid. What the custodian CAN legitimately do is
  // invite the PM in, using the contact email the contract named, so they
  // can sign up and fill in their own profile - same as the manual invite
  // form elsewhere in this step, just pre-filled from the document.
  async function handleInvitePM() {
    if (!pmInviteEmail.trim()) return
    setPmInviting(true)
    try {
      const fd = new FormData()
      fd.set("email", pmInviteEmail.trim())
      fd.set("role", "PROPERTY_MANAGER")
      await createInvite(fd)
      setPmInvited(true)
      toast.success("Property Manager invited")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite")
    } finally {
      setPmInviting(false)
    }
  }

  function removeUnit(number: string) {
    setPendingUnits((prev) => prev.filter((u) => u.number !== number))
  }

  function removeSeat(title: string) {
    setPendingSeats((prev) => prev.filter((s) => s.title !== title))
  }

  function removeOwner(unitNumber: string) {
    setPendingOwners((prev) => prev.filter((o) => o.unitNumber !== unitNumber))
  }

  function updateOwnerEmail(unitNumber: string, email: string) {
    setPendingOwners((prev) => prev.map((o) => (o.unitNumber === unitNumber ? { ...o, email } : o)))
  }

  // Adding someone here is content, not a send - it stages them on the
  // shared Owner Roster (PendingOwner) so the custodian can keep building
  // the list, show it to others, and come back to actually invite people
  // whenever they're ready. Unlike the old immediate-invite flow, an email
  // isn't required at this step - only sending later requires one.
  async function handleAddToRoster() {
    if (pendingOwners.length === 0) return
    setApplying(true)
    try {
      const results = await upsertPendingOwnersByUnitNumber(
        pendingOwners.map((o) => ({
          unitNumber: o.unitNumber,
          name: o.name,
          email: o.email || null,
          phone: o.phone,
          emergencyContactName: o.emergencyContactName,
          emergencyContactPhone: o.emergencyContactPhone,
          unitManagerName: o.unitManagerName,
          unitManagerCompany: o.unitManagerCompany,
          unitManagerEmail: o.unitManagerEmail,
          unitManagerPhone: o.unitManagerPhone,
        }))
      )
      setRosterResults(results)
      const added = results.filter((r) => r.success).length
      if (added > 0) toast.success(`Added ${added} owner${added !== 1 ? "s" : ""} to the roster`)
      const failed = results.length - added
      if (failed > 0) toast.error(`${failed} skipped - see details below`)
      setApplied(true)
      setPendingOwners([])
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add owners")
    } finally {
      setApplying(false)
    }
  }

  async function handleApplySetup() {
    setApplying(true)
    try {
      const hasOrgFields = Object.values(orgFields).some((v) => v.trim())
      if (hasOrgFields) {
        const addressForm = new FormData()
        addressForm.set("addressLine1", orgFields.addressLine1)
        addressForm.set("addressLine2", orgFields.addressLine2)
        addressForm.set("city", orgFields.city)
        addressForm.set("state", orgFields.state)
        addressForm.set("postalCode", orgFields.postalCode)
        addressForm.set("country", orgFields.country)
        addressForm.set("legalEntityName", orgFields.legalEntityName)
        await updateOrgAddress(addressForm)

        const holderForm = new FormData()
        if (orgFields.accountOwnerName) holderForm.set("accountOwnerName", orgFields.accountOwnerName)
        if (orgFields.accountOwnerTitle) holderForm.set("accountOwnerTitle", orgFields.accountOwnerTitle)
        if (orgFields.accountOwnerEmail) holderForm.set("accountOwnerEmail", orgFields.accountOwnerEmail)
        if (orgFields.accountOwnerPhone) holderForm.set("accountOwnerPhone", orgFields.accountOwnerPhone)
        if (holderForm.keys().next().done === false) {
          await updateOrgAccountHolderData(holderForm)
        }
      }

      if (pendingUnits.length > 0) {
        await bulkAddUnits(pendingUnits.map((u) => ({ number: u.number, building: u.building ?? undefined })))
      }

      for (const seat of pendingSeats) {
        const result = await createBoardPosition({
          title: seat.title,
          holderName: seat.holderName ?? undefined,
          holderEmail: seat.holderEmail ?? undefined,
          // Deliberately not falling back to meetingDate here - for a
          // founding constitution/deed, "meetingDate" is often the
          // document's registration/incorporation date, which is not any
          // particular officer's actual term start. A wrong historical
          // date is worse than an honest "added today" default.
          termStart: seat.termStart ?? new Date().toISOString().slice(0, 10),
        })
        if (result.success) {
          onBoardPositionAdded?.({ id: crypto.randomUUID(), title: seat.title, userId: null })
        }
      }

      setApplied(true)
      setPendingUnits([])
      setPendingSeats([])
      toast.success("Setup details applied")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply extracted details")
    } finally {
      setApplying(false)
    }
  }

  const title = mode === "invites" ? "Import owners from a document (optional)" : "Import from documents (optional)"
  const description =
    mode === "invites"
      ? "Have a roster or contact list for your owners? Upload it and we'll match each one to a unit, adding any unit that isn't on file yet - review before adding them to your Owner Roster."
      : "Already have your constitution, a budget, meeting minutes, contracts, or a utility bill? Upload them and we'll fill in what we can below - review everything before it's applied. This is optional - you can still enter everything by hand instead or afterward."

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-purple-600" /> : <ChevronRight className="h-4 w-4 text-purple-600" />}
        <Sparkles className="h-4 w-4 text-purple-600" />
        <span className="font-medium text-sm text-purple-900 flex-1">{title}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-xs text-purple-700">{description}</p>
          <div className="space-y-2">
            <Input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.csv" onChange={handleFilesSelected} />
            <p className="text-[11px] text-gray-400">{UPLOAD_HINT}</p>
            {extracting && (
              <p className="text-xs text-purple-700 flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading document(s)...
              </p>
            )}
          </div>

          {hasExtracted && mode === "invites" && (
            <div className="space-y-3 bg-white rounded-lg p-4 border border-purple-100">
              {pendingOwners.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Owners detected</p>
                  <div className="space-y-1.5">
                    {pendingOwners.map((o) => {
                      const hasExtraDetail =
                        o.phone || o.emergencyContactName || o.unitManagerName || o.unitManagerCompany
                      return (
                        <div key={o.unitNumber} className="bg-gray-50 rounded-lg px-2.5 py-1.5 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600 shrink-0 w-16 truncate">{o.unitNumber}</span>
                            <span className="text-xs text-gray-500 shrink-0 w-28 truncate">{o.name ?? "—"}</span>
                            <Input
                              value={o.email}
                              onChange={(e) => updateOwnerEmail(o.unitNumber, e.target.value)}
                              placeholder="owner@example.com - add to invite"
                              className="h-7 text-xs flex-1"
                            />
                            <button type="button" onClick={() => removeOwner(o.unitNumber)} className="text-gray-400 hover:text-red-500 shrink-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {hasExtraDetail && (
                            <p className="text-[11px] text-gray-400 pl-[4.5rem]">
                              {o.phone && <>Phone: {o.phone}. </>}
                              {o.emergencyContactName && (
                                <>
                                  Emergency contact: {o.emergencyContactName}
                                  {o.emergencyContactPhone && ` (${o.emergencyContactPhone})`}.{" "}
                                </>
                              )}
                              {(o.unitManagerName || o.unitManagerCompany) && (
                                <>
                                  Unit manager: {[o.unitManagerName, o.unitManagerCompany].filter(Boolean).join(" / ")}
                                  {o.unitManagerEmail && `, ${o.unitManagerEmail}`}
                                  {o.unitManagerPhone && `, ${o.unitManagerPhone}`}.
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Adding these saves them to your Owner Roster - it doesn&apos;t send anything. Send invites
                    whenever you&apos;re ready, from the roster below.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No owner rows with a unit number were found in that document.</p>
              )}

              {rosterResults && rosterResults.some((r) => !r.success) && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-red-800 mb-1">Skipped</p>
                  {rosterResults
                    .filter((r) => !r.success)
                    .map((r, i) => (
                      <p key={i} className="text-xs text-red-600">
                        {r.unitNumber}: {r.error}
                      </p>
                    ))}
                </div>
              )}

              {pendingOwners.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddToRoster}
                  disabled={applying}
                  className="gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {applying ? "Adding..." : `Add to Owner Roster (${pendingOwners.length})`}
                </Button>
              )}
              {applied && pendingOwners.length === 0 && (
                <span className="text-xs text-green-700">Added to the Owner Roster below.</span>
              )}
            </div>
          )}

          {hasExtracted && mode === "units" && (
            <div className="space-y-4 bg-white rounded-lg p-4 border border-purple-100">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Organization Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Legal entity name" value={orgFields.legalEntityName} onChange={(e) => updateOrgField("legalEntityName", e.target.value)} className="col-span-2" />
                  <Input placeholder="Address line 1" value={orgFields.addressLine1} onChange={(e) => updateOrgField("addressLine1", e.target.value)} className="col-span-2" />
                  <Input placeholder="Address line 2" value={orgFields.addressLine2} onChange={(e) => updateOrgField("addressLine2", e.target.value)} className="col-span-2" />
                  <Input placeholder="City" value={orgFields.city} onChange={(e) => updateOrgField("city", e.target.value)} />
                  <Input placeholder="State/Province" value={orgFields.state} onChange={(e) => updateOrgField("state", e.target.value)} />
                  <Input placeholder="Postal code" value={orgFields.postalCode} onChange={(e) => updateOrgField("postalCode", e.target.value)} />
                  <Input placeholder="Country" value={orgFields.country} onChange={(e) => updateOrgField("country", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Account holder name" value={orgFields.accountOwnerName} onChange={(e) => updateOrgField("accountOwnerName", e.target.value)} />
                  <Input placeholder="Title" value={orgFields.accountOwnerTitle} onChange={(e) => updateOrgField("accountOwnerTitle", e.target.value)} />
                  <Input placeholder="Email" value={orgFields.accountOwnerEmail} onChange={(e) => updateOrgField("accountOwnerEmail", e.target.value)} />
                  <Input placeholder="Phone" value={orgFields.accountOwnerPhone} onChange={(e) => updateOrgField("accountOwnerPhone", e.target.value)} />
                </div>
              </div>

              {pendingUnits.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">Units detected</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingUnits.map((u) => (
                      <span key={u.number} className="inline-flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2 py-1">
                        {u.number}
                        {u.building && ` · ${u.building}`}
                        <button type="button" onClick={() => removeUnit(u.number)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {pendingSeats.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">Board positions detected</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingSeats.map((s) => (
                      <span key={s.title} className="inline-flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2 py-1">
                        {s.title}
                        {s.holderName && ` — ${s.holderName}`}
                        <button type="button" onClick={() => removeSeat(s.title)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {budgetLineItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-amber-900 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> For your Board
                  </p>
                  <p className="text-xs text-amber-700">
                    Found {budgetLineItems.length} budget line item{budgetLineItems.length !== 1 ? "s" : ""} -{" "}
                    {budgetLineItems.map((i) => `${i.label} ($${i.budgetedAmount.toLocaleString()})`).join(", ")}.
                    A Board Member or Property Manager can enter this as the real budget once they&apos;re set up.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={handleApplySetup} disabled={applying || applied} className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {applying ? "Applying..." : applied ? "Applied" : "Apply to Setup"}
                </Button>
                {applied && <span className="text-xs text-green-700">Saved - check the lists above and below.</span>}
              </div>
            </div>
          )}

          {pmCompany && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-blue-900 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" /> Property Manager detected
                </p>
                {!pmInvited && (
                  <button
                    type="button"
                    onClick={() => {
                      setPmCompany(null)
                      setPmInviteEmail("")
                    }}
                    className="text-[11px] text-blue-700 hover:text-red-600 underline shrink-0"
                  >
                    Not right - clear
                  </button>
                )}
              </div>
              <p className="text-xs text-blue-700">
                Found a management contract naming <strong>{pmCompany.legalName}</strong>
                {pmCompany.primaryContactName && ` (contact: ${pmCompany.primaryContactName})`}
                {pmCompany.phone && `, ${pmCompany.phone}`}. Their own Company Profile can only be filled in by the
                Property Manager themselves once they have an account - invite them below to get started. If this
                isn&apos;t the management company, clear it above and enter their email directly.
              </p>
              {pmInvited ? (
                <p className="text-xs text-green-700">Invited - share the link from the invite list below.</p>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={pmInviteEmail}
                    onChange={(e) => setPmInviteEmail(e.target.value)}
                    placeholder="pm@example.com"
                    className="h-7 text-xs flex-1 bg-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleInvitePM}
                    disabled={pmInviting || !pmInviteEmail.trim()}
                    className="gap-1.5 shrink-0"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {pmInviting ? "Inviting..." : "Invite Property Manager"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
