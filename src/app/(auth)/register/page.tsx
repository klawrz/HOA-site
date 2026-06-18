"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        orgName: form.get("orgName"),
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error || "Registration failed")
    } else {
      router.push("/login?registered=1")
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/HOPE-logo.png" alt="HOPE" height={48} width={160} className="object-contain" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create your organization</CardTitle>
            <CardDescription>
              You&apos;ll be the account owner. After signing in you&apos;ll configure your units and invite members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="orgName">HOA / Organization Name</Label>
                <Input id="orgName" name="orgName" placeholder="Sunrise Heights HOA" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">Your Full Name</Label>
                <Input id="name" name="name" placeholder="Jane Smith" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Your Email</Label>
                <Input id="email" name="email" type="email" placeholder="jane@example.com" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create organization"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-center text-gray-500">
              Have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
            <p className="mt-2 text-sm text-center text-gray-500">
              Have an invite link?{" "}
              <span className="text-gray-400">Click it to create your account.</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
