import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnboarding = nextUrl.pathname.startsWith("/onboarding")
      const isPlatformAdmin = nextUrl.pathname.startsWith("/platform-admin")
      if (isDashboard || isOnboarding || isPlatformAdmin) return isLoggedIn
      if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
  },
} satisfies NextAuthConfig
