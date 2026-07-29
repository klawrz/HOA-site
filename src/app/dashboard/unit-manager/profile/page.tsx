import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileForm } from "./profile-form"
import { parseSpecialties } from "@/lib/unit-manager-specialties"

export default async function UnitManagerProfilePage() {
  const session = await auth()
  if (!session || session.user.role !== "UNIT_MANAGER") redirect("/dashboard")

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/dashboard")

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-gray-500 mt-1">
          This is what Owners see when picking a Unit Manager for their unit. A complete profile
          gets you more business.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Directory Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              company: user.company,
              headline: user.headline,
              bio: user.bio,
              phone: user.phone,
              yearsExperience: user.yearsExperience,
              specialties: parseSpecialties(user.specialties),
              directoryVisible: user.directoryVisible,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
