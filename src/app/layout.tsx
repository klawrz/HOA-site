import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/sonner"

// Named "--font-sans" (not the font's own name) deliberately - globals.css's
// `@theme inline { --font-sans: var(--font-sans) }` picks up whatever CSS
// variable is actually named --font-sans on <html> at runtime. The
// previous font here was named --font-geist-sans, which that block never
// referenced - so it sat on <html> unused and the whole app quietly fell
// back to the browser's plain system sans-serif stack the entire time.
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "HOPE",
  description: "Home Owner's Association management portal",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${sans.variable} h-full`}>
      <body className="h-full bg-gray-50 antialiased">
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
