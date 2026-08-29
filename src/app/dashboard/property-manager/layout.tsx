import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { PropertyManagerQuickLinkTiles } from "@/components/property-manager/quick-link-tiles"

// Wraps every property-manager page (not just the dashboard) with the same
// colored quick-link tile row - same reasoning as the owner section's
// layout.tsx: clicking through to Contracts shouldn't strand you there if
// you meant to go to Budget or Units next.
export default async function PropertyManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  return (
    <div className="space-y-4">
      <PropertyManagerQuickLinkTiles />
      {children}
    </div>
  )
}
