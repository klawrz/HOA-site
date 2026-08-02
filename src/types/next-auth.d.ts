import { Role } from "@/generated/prisma"
import { DefaultSession } from "next-auth"

// orgId and role are always co-null: a session either has an active
// Membership (both set) or is a platform-admin-only session with no
// Membership at all (both null). Modeling this as a union - rather than two
// independently-nullable fields - means every existing `if
// (!session.user.orgId) return` guard across the app also narrows `role` to
// non-null for free, with no changes needed at those call sites.
type ActiveOrgUser = {
  id: string
  orgId: string
  role: Role
  isBoardMember: boolean
  isPlatformAdmin: boolean
}

type NoOrgUser = {
  id: string
  orgId: null
  role: null
  isBoardMember: false
  isPlatformAdmin: boolean
}

declare module "next-auth" {
  interface User {
    role: Role | null
    orgId: string | null
    isBoardMember: boolean
    isPlatformAdmin: boolean
  }
  interface Session {
    user: (ActiveOrgUser | NoOrgUser) & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role | null
    orgId: string | null
    isBoardMember: boolean
    isPlatformAdmin: boolean
  }
}
