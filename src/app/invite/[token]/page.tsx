import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AcceptInviteForm } from "./form"
import { formatDateISO } from "@/lib/utils"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const invite = await db.invite.findUnique({
    where: { token },
    include: { org: true, unit: true },
  })

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re invited!</h1>
          <p className="text-gray-500 mt-1">
            Join <strong>{invite.org.name}</strong> as a{" "}
            <strong>{invite.role.replace(/_/g, " ").toLowerCase()}</strong>
            {invite.unit ? ` for Unit ${invite.unit.number}` : ""}.
          </p>
          {invite.role === "RENTER" && invite.monthlyRent != null && (
            <div className="mt-3 text-sm bg-white border rounded-lg px-3 py-2 text-left">
              <p className="font-medium">Lease terms</p>
              <p className="text-gray-500">
                ${invite.monthlyRent.toLocaleString()}/mo · from {invite.leaseStartDate && formatDateISO(invite.leaseStartDate)}
                {invite.leaseEndDate ? ` to ${formatDateISO(invite.leaseEndDate)}` : " (no end date on file)"}
              </p>
            </div>
          )}
        </div>
        <AcceptInviteForm token={token} email={invite.email} />
      </div>
    </div>
  )
}
