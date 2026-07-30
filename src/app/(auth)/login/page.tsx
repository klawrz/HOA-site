"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const demoUsers = [
  { role: "Owner", email: "owner@sunrise.hoa", color: "bg-blue-100 text-blue-800" },
  { role: "Renter", email: "renter@sunrise.hoa", color: "bg-green-100 text-green-800" },
  { role: "Property Manager", email: "manager@sunrise.hoa", color: "bg-purple-100 text-purple-800" },
  { role: "Contractor", email: "contractor@sunrise.hoa", color: "bg-orange-100 text-orange-800" },
  { role: "Board Member", email: "board@sunrise.hoa", color: "bg-red-100 text-red-800" },
]

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justReset = searchParams.get("reset") === "1"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)
    if (result?.error) {
      setError("Invalid email or password")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword("password123")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-semibold">Sunrise HOA Portal</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the portal</CardDescription>
          </CardHeader>
          <CardContent>
            {justReset && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">
                Password reset. Sign in with your new password.
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
                Demo accounts (password: password123)
              </p>
              <div className="flex flex-wrap gap-2">
                {demoUsers.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => fillDemo(u.email)}
                    className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer ${u.color}`}
                  >
                    {u.role}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-4 text-sm text-center text-gray-500">
              No account?{" "}
              <Link href="/register" className="text-blue-600 hover:underline">
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
