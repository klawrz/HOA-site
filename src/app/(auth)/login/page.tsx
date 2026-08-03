"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
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

type OrgChoice = { orgId: string; orgName: string; role: string }

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justReset = searchParams.get("reset") === "1"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [orgChoices, setOrgChoices] = useState<OrgChoice[] | null>(null)

  async function finishSignIn(orgId?: string) {
    // signIn's credentials object is serialized to form-encoded data - an
    // `orgId: undefined` key still comes through server-side as the literal
    // string "undefined" rather than being dropped, so omit the key
    // entirely for the common single-org case instead of passing undefined.
    const result = await signIn("credentials", {
      email,
      password,
      ...(orgId ? { orgId } : {}),
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/precheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()

    if (!data.ok) {
      setLoading(false)
      setError("Invalid email or password")
      return
    }

    if (data.memberships.length > 1) {
      setLoading(false)
      setOrgChoices(data.memberships)
      return
    }

    await finishSignIn()
  }

  async function handlePickOrg(orgId: string) {
    setLoading(true)
    setError("")
    await finishSignIn(orgId)
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword("password123")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center mb-8">
          <Image src="/HOPE-logo.png" alt="HOPE" height={48} width={160} className="object-contain" />
        </Link>

        <Card>
          {orgChoices ? (
            <>
              <CardHeader>
                <CardTitle>Choose an organization</CardTitle>
                <CardDescription>Your account is a member of more than one organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {orgChoices.map((org) => (
                  <button
                    key={org.orgId}
                    onClick={() => handlePickOrg(org.orgId)}
                    disabled={loading}
                    className="w-full text-left px-4 py-3 rounded-lg border hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span className="font-medium">{org.orgName}</span>
                    <span className="text-xs text-gray-500">{org.role.replace(/_/g, " ")}</span>
                  </button>
                ))}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  onClick={() => setOrgChoices(null)}
                  className="text-xs text-blue-600 hover:underline mt-2"
                >
                  Back
                </button>
              </CardContent>
            </>
          ) : (
            <>
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
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
