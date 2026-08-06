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
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Bank</p>
          <p>{bank.bankName || <span className="text-gray-400">Not on file</span>}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Branch Address</p>
          <p>{bank.bankAddress || <span className="text-gray-400">Not on file</span>}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Branch Phone</p>
          <p>{bank.bankPhone || <span className="text-gray-400">Not on file</span>}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Account</p>
          <p>{bank.bankAccountName || <span className="text-gray-400">Not on file</span>}</p>
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
          <p className="text-xs text-gray-400 mb-1">Bank Key Contact</p>
          {hasContact ? (
            <div className="space-y-0.5">
              {bank.bankContactName && <p className="text-gray-600">{bank.bankContactName}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {bank.bankContactPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {bank.bankContactPhone}
                  </span>
                )}
                {bank.bankContactEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {bank.bankContactEmail}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Not on file</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400 mb-1">How to Pay Dues / Send Funds</p>
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
