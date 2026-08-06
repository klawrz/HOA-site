import Image from "next/image"
import { ShieldAlert } from "lucide-react"
import { SignOutButton } from "@/app/platform-admin/sign-out-button"

export function SuspendedNotice({ orgName }: { orgName: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <Image src="/HOPE-logo.png" alt="HOPE" height={40} width={140} className="object-contain mb-8" />
      <div className="p-4 bg-red-50 rounded-full mb-4">
        <ShieldAlert className="h-10 w-10 text-red-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{orgName} has been suspended</h1>
      <p className="text-gray-500 max-w-sm mb-6">
        Access to this portal has been paused by HOPE. Contact your platform administrator for details.
      </p>
      <SignOutButton />
    </div>
  )
}
