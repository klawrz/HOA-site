import { Role } from "@/generated/prisma"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role: Role
    orgId: string | null
  }
  interface Session {
    user: {
      id: string
      role: Role
      orgId: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    orgId: string | null
  }
}
