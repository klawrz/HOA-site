import { MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Address {
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

// Read-only here - the property address is edited from the Account Owner's
// own dashboard (PropertyAddressCard there), not duplicated as a second
// edit path on every role's Key Information page.
export function PropertyAddressCard({ address }: { address: Address }) {
  const line2 = [address.city, address.state, address.postalCode].filter(Boolean).join(", ")
  const lines = [address.addressLine1, address.addressLine2, line2, address.country].filter(Boolean)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Property Address
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {lines.length > 0 ? (
          <p className="text-gray-600">{lines.join(" · ")}</p>
        ) : (
          <p className="text-gray-400">Not on file</p>
        )}
      </CardContent>
    </Card>
  )
}
