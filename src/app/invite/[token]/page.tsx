import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AcceptInviteForm } from "./form"

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
        </div>
        <AcceptInviteForm token={token} email={invite.email} />
      </div>
    </div>
  )
}
