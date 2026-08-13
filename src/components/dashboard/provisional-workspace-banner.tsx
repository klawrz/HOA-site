import Link from "next/link"
import { ShieldAlert } from "lucide-react"

// Persistent, not dismissible - unlike a toast, this needs to stay visible
// for as long as the org hasn't been authorized. See
// Organization.verificationStatus for what this gates.
export function ProvisionalWorkspaceBanner({ orgName, verificationHref }: { orgName: string; verificationHref: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">
          Unverified workspace — not yet authorized by {orgName}
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          You can explore HOPE and demo it with a few collaborators, but this workspace can&apos;t issue dues, send
          official announcements, or import a full owner list until it&apos;s verified.{" "}
          <Link href={verificationHref} className="underline hover:text-amber-900">
            Request verification
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
