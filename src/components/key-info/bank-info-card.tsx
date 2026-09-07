import { Landmark, Mail, Phone, ShieldCheck, AlertTriangle } from "lucide-react"
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

export function BankInfoCard({
  bank,
  canManage,
  insurance,
  insuranceHref = "/dashboard/board/contracts",
}: {
  bank: BankInfo
  canManage: boolean
  insurance?: InsuranceInfo | null
  insuranceHref?: string
}) {
  const hasContact = bank.bankContactName || bank.bankContactPhone || bank.bankContactEmail
  const showInsurance = insurance !== undefined
  const expiry = insurance ? getExpiryStatus(insurance.endDate, insurance.reminderDaysBefore) : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4" /> {showInsurance ? "Banking & Insurance" : "Bank Information"}
        </CardTitle>
        {canManage && <BankInfoDialog bank={bank} />}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-xs text-gray-400">Bank</p>
            <p className="truncate">{bank.bankName || <span className="text-gray-400">Not on file</span>}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Account</p>
            <p className="truncate">{bank.bankAccountName || <span className="text-gray-400">Not on file</span>}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Branch Address</p>
            <p className="truncate">{bank.bankAddress || <span className="text-gray-400">Not on file</span>}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Branch Phone</p>
            <p className="truncate">{bank.bankPhone || <span className="text-gray-400">Not on file</span>}</p>
          </div>
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

        {showInsurance && (
          <div className="border-t pt-2">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Property Insurance
            </p>
            {insurance ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
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
            ) : (
              <p className="text-amber-700 text-xs flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                No active insurance contract on file —{" "}
                <Link href={insuranceHref} className="underline">
                  add one under Contracts
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
