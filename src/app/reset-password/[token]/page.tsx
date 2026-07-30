import { db } from "@/lib/db"
import { Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { ResetPasswordForm } from "./form"

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const resetToken = await db.passwordResetToken.findUnique({ where: { token } })
  const valid = !!resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-semibold">Sunrise HOA Portal</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{valid ? "Choose a new password" : "Link expired"}</CardTitle>
            {!valid && (
              <CardDescription>
                This reset link is invalid or has expired. Request a new one to continue.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {valid ? (
              <ResetPasswordForm token={token} />
            ) : (
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Request a new reset link
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
