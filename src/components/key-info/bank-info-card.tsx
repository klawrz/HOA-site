import { Landmark, Mail, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export function BankInfoCard({ bank, canManage }: { bank: BankInfo; canManage: boolean }) {
  const hasContact = bank.bankContactName || bank.bankContactPhone || bank.bankContactEmail

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4" /> Bank Information
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
      </CardContent>
    </Card>
  )
}
