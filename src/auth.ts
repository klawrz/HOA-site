import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        orgId: { label: "Organization", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.password) return null
        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isValid) return null

        const memberships = await db.membership.findMany({ where: { userId: user.id } })
        const requestedOrgId = credentials.orgId as string | undefined

        let selected: (typeof memberships)[number] | null = null
        if (requestedOrgId) {
          // Never trust a client-supplied orgId blindly - it must be one of
          // this user's real memberships.
          selected = memberships.find((m) => m.orgId === requestedOrgId) ?? null
          if (!selected) return null
        } else if (memberships.length === 1) {
          selected = memberships[0]
        } else if (memberships.length > 1) {
          // Ambiguous - the login page precheck must resolve this and
          // re-submit with an explicit orgId before we ever get here.
          return null
        }

        if (!selected && !user.isPlatformAdmin) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: selected?.role ?? null,
          orgId: selected?.orgId ?? null,
          isBoardMember: selected?.isBoardMember ?? false,
          isPlatformAdmin: user.isPlatformAdmin,
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id!
        token.role = (user as { role: string | null }).role as never
        token.orgId = (user as { orgId: string | null }).orgId
        token.isBoardMember = (user as { isBoardMember: boolean }).isBoardMember
        token.isPlatformAdmin = (user as { isPlatformAdmin: boolean }).isPlatformAdmin
      }
      // Org switch from the account menu - re-validate server-side against
      // real Membership rows rather than trusting the client's requested
      // orgId, and silently ignore a request for an org the user doesn't
      // actually belong to (fail closed, same as authorize() above).
      if (trigger === "update" && session?.orgId) {
        const membership = await db.membership.findFirst({
          where: { userId: token.id as string, orgId: session.orgId as string },
        })
        if (membership) {
          token.orgId = membership.orgId
          token.role = membership.role as never
          token.isBoardMember = membership.isBoardMember
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token && session.user) {
        const id = token.id as string
        const isPlatformAdmin = token.isPlatformAdmin as boolean
        const orgId = token.orgId as string | null
        const role = token.role as import("@/generated/prisma").Role | null
        const isBoardMember = token.isBoardMember as boolean
        // orgId/role are a discriminated union (see next-auth.d.ts) - build
        // the whole user object per-branch rather than mutating individual
        // properties, since TS can't verify a mutation keeps a union valid.
        session.user = orgId && role
          ? { ...session.user, id, isPlatformAdmin, orgId, role, isBoardMember }
          : { ...session.user, id, isPlatformAdmin, orgId: null, role: null, isBoardMember: false }
      }
      return session
    },
  },
  pages: { signIn: "/login" },
})
