import { Landmark, Mail, Phone, ShieldCheck, AlertTriangle, MapPin } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExpiryStatus, expiryStatusConfig } from "@/lib/expiry-status"
import { formatDate } from "@/lib/utils"
import { billingPeriodLabel } from "@/lib/contract-styles"
import { BankInfoDialog } from "./bank-info-dialog"

interface BankInfo {
  bankName: string | null
  bankAddress: string | null
  bankPhone: string | null
  bankAccountName: string | null
  bankSigningAuthority: string | null
  bankPaymentInstructions: string | null
  bankContactName: string | null
  bankContactPhone: string | null
  bankContactEmail: string | null
}

interface Address {
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

// The active property-insurance contract, summarised for the Key
// Information card. Pass `null` to show the section with a "not on file"
// warning (making a coverage gap visible); omit the prop entirely to hide
// the section (e.g. an owner-facing surface where property-wide contracts
// are confidential).
export interface InsuranceInfo {
  insurerName: string
  startDate: Date
  endDate: Date | null
  amount: number | null
  billingPeriod: string | null
  reminderDaysBefore: number
}

function LV({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="truncate">{value || <span className="text-gray-400">Not on file</span>}</p>
    </div>
  )
}

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" /> {children}
    </p>
  )
}

function AddressBlock({ address }: { address: Address }) {
  const line2 = [address.city, address.state, address.postalCode].filter(Boolean).join(", ")
  const lines = [address.addressLine1, address.addressLine2, line2, address.country].filter(Boolean)
  return lines.length > 0 ? (
    <p className="text-gray-600">{lines.join(" · ")}</p>
  ) : (
    <p className="text-gray-400">Not on file</p>
  )
}

function BankFields({ bank, stacked }: { bank: BankInfo; stacked?: boolean }) {
  const hasContact = bank.bankContactName || bank.bankContactPhone || bank.bankContactEmail
  return (
    <div className="space-y-2 text-sm">
      <div className={stacked ? "space-y-2" : "grid grid-cols-2 gap-x-4 gap-y-2"}>
        <LV label="Bank" value={bank.bankName} />
        <LV label="Account" value={bank.bankAccountName} />
        <LV label="Branch Address" value={bank.bankAddress} />
        <LV label="Branch Phone" value={bank.bankPhone} />
      </div>
      <div>
        <p className="text-xs text-gray-400">Signing Authority</p>
        {bank.bankSigningAuthority ? (
          <p className="text-gray-600 whitespace-pre-line">{bank.bankSigningAuthority}</p>
        ) : (
          <p className="text-gray-400">Not on file</p>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-400">Bank Key Contact</p>
        {hasContact ? (
          <p className="text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {bank.bankContactName && <span>{bank.bankContactName}</span>}
            {bank.bankContactPhone && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Phone className="h-3 w-3" /> {bank.bankContactPhone}
              </span>
            )}
            {bank.bankContactEmail && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Mail className="h-3 w-3" /> {bank.bankContactEmail}
              </span>
            )}
          </p>
        ) : (
          <p className="text-gray-400">Not on file</p>
        )}
      </div>
      <div className="bg-gray-50 rounded-lg px-3 py-1.5">
        <p className="text-xs text-gray-400">How to Pay Dues / Send Funds</p>
        {bank.bankPaymentInstructions ? (
          <p className="text-gray-600 whitespace-pre-line">{bank.bankPaymentInstructions}</p>
        ) : (
          <p className="text-gray-400">Not on file</p>
        )}
      </div>
    </div>
  )
}

function InsuranceBlock({
  insurance,
  insuranceHref,
}: {
  insurance: InsuranceInfo | null
  insuranceHref: string
}) {
  const expiry = insurance ? getExpiryStatus(insurance.endDate, insurance.reminderDaysBefore) : null
  if (!insurance) {
    return (
      <p className="text-amber-700 text-xs flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        No active insurance contract on file —{" "}
        <Link href={insuranceHref} className="underline">
          add one under Contracts
        </Link>
        .
      </p>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
      <div>
        <p className="text-xs text-gray-400">Insurer</p>
        <p className="truncate">{insurance.insurerName}</p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Premium</p>
        <p className="truncate">
          {insurance.amount != null
            ? `$${insurance.amount.toLocaleString()}${
                insurance.billingPeriod ? ` / ${billingPeriodLabel[insurance.billingPeriod]}` : ""
              }`
            : "—"}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Policy Period</p>
        <p className="truncate">
          {formatDate(insurance.startDate)} – {insurance.endDate ? formatDate(insurance.endDate) : "ongoing"}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Status</p>
        {expiry && expiry !== "NONE" ? (
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${expiryStatusConfig[expiry].color}`}
          >
            {expiryStatusConfig[expiry].label}
          </span>
        ) : (
          <p>Active</p>
        )}
      </div>
    </div>
  )
}

// Bank / insurance / (optionally) property address, together on the Key
// Information page. Pass `address` to render the combined side-by-side
// block (Banking | Address + Insurance) - fewer full-width cards, less
// scrolling. Without it, this is just the banking (+ insurance) card.
export function BankInfoCard({
  bank,
  canManage,
  insurance,
  insuranceHref = "/dashboard/board/contracts",
  address,
}: {
  bank: BankInfo
  canManage: boolean
  insurance?: InsuranceInfo | null
  insuranceHref?: string
  address?: Address
}) {
  const showInsurance = insurance !== undefined
  const combined = address !== undefined

  const title = combined
    ? "Banking, Insurance & Address"
    : showInsurance
      ? "Banking & Insurance"
      : "Bank Information"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4" /> {title}
        </CardTitle>
        {canManage && <BankInfoDialog bank={bank} />}
      </CardHeader>
      <CardContent>
        {combined ? (
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            <div>
              <SectionLabel icon={Landmark}>Banking</SectionLabel>
              <BankFields bank={bank} stacked />
            </div>
            <div className="space-y-5">
              <div>
                <SectionLabel icon={MapPin}>Property Address</SectionLabel>
                <div className="text-sm">
                  <AddressBlock address={address} />
                </div>
              </div>
              {showInsurance && (
                <div>
                  <SectionLabel icon={ShieldCheck}>Property Insurance</SectionLabel>
                  <InsuranceBlock insurance={insurance ?? null} insuranceHref={insuranceHref} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <BankFields bank={bank} />
            {showInsurance && (
              <div className="border-t pt-2">
                <SectionLabel icon={ShieldCheck}>Property Insurance</SectionLabel>
                <InsuranceBlock insurance={insurance ?? null} insuranceHref={insuranceHref} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
