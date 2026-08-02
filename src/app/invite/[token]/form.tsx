"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AcceptInviteForm({
  token,
  email,
  existingAccount,
}: {
  token: string
  email: string
  existingAccount: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function accept(body: { name?: string; password?: string }) {
    setLoading(true)
    setError("")
    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...body }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error || "Failed to accept invite")
    } else {
      router.push("/login?registered=1")
    }
  }

  if (existingAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add this organization to your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <p className="text-sm text-gray-500">
            You already have a HOPE account with this email. Accepting will add this
            organization to it - sign in as usual afterward and pick it from the org list.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={() => accept({})} className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Accept invite"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    await accept({
      name: form.get("name") as string,
      password: form.get("password") as string,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" placeholder="Jane Smith" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Accept invite & create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
