"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function listMyMemberships() {
  const session = await auth()
  if (!session?.user.id) return []
  return db.membership.findMany({
    where: { userId: session.user.id },
    include: { org: { select: { id: true, name: true } } },
  })
}
