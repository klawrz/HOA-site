import { UserCog } from "lucide-react"

type PMCompany = {
  legalName: string
  entityType: "COMPANY" | "INDIVIDUAL"
  email: string | null
  phone: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
}

function addressLines(c: PMCompany) {
  const line2 = [c.city, c.state, c.postalCode].filter(Boolean).join(", ")
  return [c.addressLine1, c.addressLine2, line2, c.country].filter(Boolean)
}

export function PropertyManagerCard({ company }: { company: PMCompany | null }) {
  if (!company) {
    return (
      <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-2">
        <UserCog className="h-4 w-4 text-gray-400 shrink-0" />
        <p className="text-sm text-gray-400">No active property manager contract on file</p>
      </div>
    )
  }

  const lines = addressLines(company)

  return (
    <div className="bg-white border rounded-xl p-5 space-y-2">
      <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
        <UserCog className="h-4 w-4 text-gray-400" /> Property Manager
      </h2>
      <div className="text-sm">
        <p className="font-medium">{company.legalName}</p>
        <p className="text-xs text-gray-400">{company.entityType === "COMPANY" ? "Company" : "Individual"}</p>
      </div>
      {(company.email || company.phone) && (
        <p className="text-sm text-gray-600">
          {[company.email, company.phone].filter(Boolean).join(" · ")}
        </p>
      )}
      {lines.length > 0 && <p className="text-sm text-gray-500">{lines.join(" · ")}</p>}
      {(company.primaryContactName || company.primaryContactEmail || company.primaryContactPhone) && (
        <div className="pt-1 border-t">
          <p className="text-xs text-gray-400 mt-1">Primary Contact</p>
          <p className="text-sm text-gray-600">
            {[company.primaryContactName, company.primaryContactEmail, company.primaryContactPhone]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}
    </div>
  )
}
