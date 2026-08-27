import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { Role } from "@/generated/prisma"

// Only the Account Owner can act on this (request verification), and only
// BOARD_MEMBER/PROPERTY_MANAGER are ever blocked by what unverified gates
// (dues, official announcements, CSV owner import) - everyone else
// (Owner/Renter/Contractor/Unit Manager) never touches those, so showing
// them an actionable-looking banner with no way to act on it was pure
// noise. See Organization.verificationStatus for what this gates.
const ACTIONABLE_ROLES: Role[] = ["ACCOUNT_OWNER"]
const INFORMED_ROLES: Role[] = ["BOARD_MEMBER", "PROPERTY_MANAGER"]

export function ProvisionalWorkspaceBanner({
  orgName,
  verificationHref,
  role,
}: {
  orgName: string
  verificationHref: string
  role: Role
}) {
  if (!ACTIONABLE_ROLES.includes(role) && !INFORMED_ROLES.includes(role)) return null

  const canRequest = ACTIONABLE_ROLES.includes(role)

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">
          Unverified workspace — not yet authorized by {orgName}
        </p>
        {canRequest ? (
          <p className="text-xs text-amber-700 mt-0.5">
            You can explore HOPE and demo it with a few collaborators, but this workspace can&apos;t issue dues, send
            official announcements, or import a full owner list until it&apos;s verified.{" "}
            <Link href={verificationHref} className="underline hover:text-amber-900">
              Request verification
            </Link>
            .
          </p>
        ) : (
          <p className="text-xs text-amber-700 mt-0.5">
            Dues and official announcements are on hold until {orgName}&apos;s Account Owner requests verification.
          </p>
        )}
      </div>
    </div>
  )
}
