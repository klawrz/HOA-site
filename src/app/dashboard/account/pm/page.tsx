import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Phone, Mail, User as UserIcon, AlertTriangle } from "lucide-react"
import { NewPMContractDialog } from "./new-pm-contract-dialog"
import { formatDateTime } from "@/lib/utils"

const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  ENDED: "bg-gray-100 text-gray-600",
}

function addressLines(c: {
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}) {
  const line2 = [c.city, c.state, c.postalCode].filter(Boolean).join(", ")
  return [c.addressLine1, c.addressLine2, line2, c.country].filter(Boolean)
}

export default async function AccountPMPage() {
  const session = await auth()
  if (!session || session.user.role !== "ACCOUNT_OWNER" || !session.user.orgId) redirect("/dashboard")

  const [contracts, companies] = await Promise.all([
    db.pMContract.findMany({
      where: { orgId: session.user.orgId },
      include: { company: { include: { emergencyContacts: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.propertyManagementCompany.findMany({ orderBy: { legalName: "asc" } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property Manager</h1>
          <p className="text-gray-500 mt-1">
            The property management company (or individual) contracted by this association
          </p>
        </div>
        <NewPMContractDialog
          companies={companies.map((c) => ({ id: c.id, legalName: c.legalName }))}
        />
      </div>

      <div className="space-y-3">
        {contracts.map((c) => (
          <Card key={c.id}>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">{c.company.legalName}</p>
                    {c.company.email && <p className="text-sm text-gray-500">{c.company.email}</p>}
                    {c.company.phone && <p className="text-sm text-gray-500">{c.company.phone}</p>}
                    {addressLines(c.company).map((line, i) => (
                      <p key={i} className="text-sm text-gray-500">{line}</p>
                    ))}
                    {c.terms && <p className="text-xs text-gray-500 mt-1">{c.terms}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      Contracted since {formatDateTime(c.startDate)}
                      {c.endDate && ` · Ends ${formatDateTime(c.endDate)}`}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[c.status]}`}>
                  {c.status}
                </span>
              </div>

              {c.company.primaryContactName && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                  <UserIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Primary Contact</p>
                    <p className="text-sm font-semibold">{c.company.primaryContactName}</p>
                    {c.company.primaryContactPhone && (
                      <p className="text-xs text-gray-500">{c.company.primaryContactPhone}</p>
                    )}
                    {c.company.primaryContactEmail && (
                      <p className="text-xs text-gray-500">{c.company.primaryContactEmail}</p>
                    )}
                  </div>
                </div>
              )}

              {c.company.emergencyContacts.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-700 flex items-center gap-1 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Emergency Contacts
                  </p>
                  <div className="space-y-2">
                    {c.company.emergencyContacts.map((ec) => (
                      <div key={ec.id} className="text-sm">
                        <p className="font-medium">
                          {ec.name}
                          {ec.role && <span className="text-gray-500 font-normal"> · {ec.role}</span>}
                        </p>
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {ec.phone}</span>
                          {ec.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {ec.email}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {contracts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No property manager on file yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
