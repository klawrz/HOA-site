import { Wrench, Mail, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Company {
  legalName: string
  email: string | null
  phone: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
}

// Read-only summary for Key Information, pulled from the active PMContract's
// company - full contract terms/history stay on the dedicated PM page, this
// is just "who to call."
export function PMKeyContactCard({ company }: { company: Company | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="h-4 w-4" /> Property Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {!company && <p className="text-gray-400">No active Property Manager on file.</p>}
        {company && (
          <>
            <p className="font-medium">{company.legalName}</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {company.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {company.phone}
                </span>
              )}
              {company.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {company.email}
                </span>
              )}
            </div>
            {(company.primaryContactName || company.primaryContactEmail || company.primaryContactPhone) && (
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-400 mb-1">Primary Contact</p>
                {company.primaryContactName && <p className="text-gray-600">{company.primaryContactName}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-0.5">
                  {company.primaryContactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {company.primaryContactPhone}
                    </span>
                  )}
                  {company.primaryContactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {company.primaryContactEmail}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
