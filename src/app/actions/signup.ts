"use server"

import bcrypt from "bcryptjs"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { slugify } from "@/lib/slugify"
import { Prisma } from "@/generated/prisma"

// Deliberately in-memory, per-process - resets on server restart and
// doesn't survive multiple instances. Same caveat as ask-hope.ts's rate
// limiter; flagged as a real gap to fix (Redis or similar) before any
// production deployment - doubly so here since this endpoint is public
// and unauthenticated, unlike ask-hope.ts's per-user limit.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 20
const requestLog = new Map<string, number[]>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const recent = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(key, recent)
    return false
  }
  recent.push(now)
  requestLog.set(key, recent)
  return true
}

async function getClientKey() {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown"
}

async function createOrgWithRetry(
  tx: Prisma.TransactionClient,
  orgName: string,
  ownerName: string,
  ownerTitle: string | null,
  ownerEmail: string
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await tx.organization.create({
        data: {
          name: orgName,
          slug: slugify(orgName),
          accountOwnerName: ownerName,
          accountOwnerTitle: ownerTitle,
          accountOwnerEmail: ownerEmail,
        },
      })
    } catch (err) {
      const isSlugCollision = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
      if (attempt === 0 && isSlugCollision) continue
      throw err
    }
  }
  throw new Error("Failed to create organization")
}

// Public, unauthenticated - lets any visitor create their own org without
// platform-admin involvement (the gated wizard in platform-admin.ts stays
// available separately for admin-assisted signups). Deliberately stricter
// than createOrganizationWithOwner about an email that already has an
// account: that flow silently attaches the new org to the existing User
// (fine for a trusted operator); an anonymous public form must not
// silently attach new org memberships to a stranger's real account by
// email alone, so this rejects instead.
export async function signUpNewOrg(data: {
  orgName: string
  ownerName: string
  ownerTitle?: string
  ownerEmail: string
  password: string
}) {
  const key = await getClientKey()
  if (!checkRateLimit(key)) {
    throw new Error("Too many signup attempts. Please try again later.")
  }

  const orgName = data.orgName.trim()
  const ownerName = data.ownerName.trim()
  const ownerTitle = data.ownerTitle?.trim() || null
  const ownerEmail = data.ownerEmail.trim().toLowerCase()
  if (!orgName || !ownerName || !ownerEmail) {
    throw new Error("Organization name, your name, and email are required")
  }
  if (!data.password || data.password.length < 8) {
    throw new Error("Password must be at least 8 characters")
  }

  const hashed = await bcrypt.hash(data.password, 12)

  try {
    const org = await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: ownerEmail } })
      if (existing) throw new Error("EMAIL_EXISTS")

      const organization = await createOrgWithRetry(tx, orgName, ownerName, ownerTitle, ownerEmail)
      const user = await tx.user.create({ data: { name: ownerName, email: ownerEmail, password: hashed } })
      await tx.membership.create({ data: { userId: user.id, orgId: organization.id, role: "ACCOUNT_OWNER" } })

      return organization
    })

    return { orgId: org.id, orgName: org.name }
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_EXISTS") {
      throw new Error("An account with this email already exists. Log in to continue.")
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(",") ?? ""
      if (target.includes("email")) {
        throw new Error("An account with this email already exists. Log in to continue.")
      }
      throw new Error("Something went wrong creating your organization. Please try again.")
    }
    throw err
  }
}
