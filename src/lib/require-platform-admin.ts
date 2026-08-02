import { auth } from "@/auth"

export async function requirePlatformAdmin() {
  const session = await auth()
  if (!session?.user.isPlatformAdmin) return null
  return session
}
