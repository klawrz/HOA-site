import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl, method } = request
      const isLoggedIn = !!auth?.user
      const isDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnboarding = nextUrl.pathname.startsWith("/onboarding")
      const isPlatformAdmin = nextUrl.pathname.startsWith("/platform-admin")
      if (isDashboard || isOnboarding || isPlatformAdmin) return isLoggedIn
      // GET-only: a real page visit to /login or /signup while already
      // logged in should bounce to the dashboard, but /signup's own wizard
      // POSTs Server Actions back to /signup mid-flow (right after it signs
      // the new user in for step 2's Basic Data submit) - redirecting THAT
      // request away turns into an unparseable response on the client
      // ("An unexpected response was received from the server"), since the
      // browser gets a redirect instead of the expected action result.
      if (isLoggedIn && method === "GET" && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
  },
} satisfies NextAuthConfig
