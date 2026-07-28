import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CompanyProfileForm } from "./company-profile-form"
import { EmergencyContacts } from "./emergency-contacts"

export default async function CompanyProfilePage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const membership = await db.pMStaffMembership.findFirst({
    where: { userId: session.user.id },
    include: { company: { include: { emergencyContacts: true } } },
  })

  const isAdmin = membership ? membership.company.createdById === session.user.id : true

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Company Profile</h1>
        <p className="text-gray-500 mt-1">
          Legal identity and contact information for your property management business
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          {membership && !isAdmin ? (
            <p className="text-sm text-gray-500">
              You&apos;re a staff member of {membership.company.legalName}. Only the person who
              registered the company can edit its profile.
            </p>
          ) : (
            <CompanyProfileForm
              existing={
                membership
                  ? {
                      legalName: membership.company.legalName,
                      registrationId: membership.company.registrationId ?? "",
                      email: membership.company.email ?? "",
                      phone: membership.company.phone ?? "",
                      addressLine1: membership.company.addressLine1 ?? "",
                      addressLine2: membership.company.addressLine2 ?? "",
                      city: membership.company.city ?? "",
                      state: membership.company.state ?? "",
                      postalCode: membership.company.postalCode ?? "",
                      country: membership.company.country ?? "",
                      primaryContactName: membership.company.primaryContactName ?? "",
                      primaryContactEmail: membership.company.primaryContactEmail ?? "",
                      primaryContactPhone: membership.company.primaryContactPhone ?? "",
                    }
                  : null
              }
            />
          )}
        </CardContent>
      </Card>

      {membership && (
        <EmergencyContacts contacts={membership.company.emergencyContacts} canEdit={isAdmin} />
      )}
    </div>
  )
}
