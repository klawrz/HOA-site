import { Role } from "@/generated/prisma"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role: Role
    orgId: string | null
    isBoardMember: boolean
  }
  interface Session {
    user: {
      id: string
      role: Role
      orgId: string | null
      isBoardMember: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    orgId: string | null
    isBoardMember: boolean
  }
}
