"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Prisma } from "@/generated/prisma"
import { revalidatePath } from "next/cache"
import { parseDateOnly } from "@/lib/occupancy"

function revalidateBoardPaths() {
  revalidatePath("/dashboard/account/board")
  revalidatePath("/dashboard/owner/governance")
}

// Resolves a position's holder to a userId. Most orgs have no other members
// yet when the Board is first being set up (nobody to pick from the
// dropdown), so holderName/holderEmail records the seat directly - same
// find-or-create-a-placeholder-User pattern as assignUnitOwner in org.ts.
// The placeholder has no Membership, so the isBoardMember auto-grant below
// only applies to the existing-member (userId) path.
async function resolveHolder(
  tx: Prisma.TransactionClient,
  orgId: string,
  data: { userId?: string; holderName?: string; holderEmail?: string }
) {
  const holderEmail = data.holderEmail?.trim().toLowerCase()
  if (holderEmail) {
    const holderName = data.holderName?.trim()
    let holder = await tx.user.findUnique({ where: { email: holderEmail } })
    if (!holder) {
      holder = await tx.user.create({ data: { name: holderName || null, email: holderEmail } })
    } else if (holderName && holderName !== holder.name) {
      holder = await tx.user.update({ where: { id: holder.id }, data: { name: holderName } })
    }
    return holder.id
  }

  if (data.userId) {
    const member = await tx.membership.findFirst({ where: { userId: data.userId, orgId } })
    if (!member) throw new Error("Invalid member")
    return data.userId
  }

  return null
}

export async function createBoardPosition(data: {
  title: string
  userId?: string
  holderName?: string
  holderEmail?: string
  termStart: string
  termEnd?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") return { success: false }
  const orgId = session.user.orgId

  const title = data.title.trim()
  if (!title) return { success: false, error: "Title required" }

  try {
    await db.$transaction(async (tx) => {
      const userId = await resolveHolder(tx, orgId, data)

      await tx.boardPosition.create({
        data: {
          orgId,
          title,
          userId,
          termStart: parseDateOnly(data.termStart),
          termEnd: data.termEnd ? parseDateOnly(data.termEnd) : null,
          notes: data.notes || null,
        },
      })

      // One-time convenience default when an existing member fills a seat -
      // not tied to the term afterward, so ending the term later doesn't
      // revoke it. Skipped for a brand-new placeholder holder, who has no
      // Membership yet to grant access on.
      if (userId && data.userId) {
        await tx.membership.update({
          where: { userId_orgId: { userId, orgId } },
          data: { isBoardMember: true },
        })
      }
    })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save" }
  }

  revalidateBoardPaths()
  return { success: true }
}

export async function updateBoardPosition(
  id: string,
  data: {
    title: string
    userId?: string
    holderName?: string
    holderEmail?: string
    termStart: string
    termEnd?: string
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") return { success: false }
  const orgId = session.user.orgId

  const position = await db.boardPosition.findUnique({ where: { id } })
  if (!position || position.orgId !== orgId) return { success: false }

  const title = data.title.trim()
  if (!title) return { success: false, error: "Title required" }

  try {
    await db.$transaction(async (tx) => {
      const userId = await resolveHolder(tx, orgId, data)

      await tx.boardPosition.update({
        where: { id },
        data: {
          title,
          userId,
          termStart: parseDateOnly(data.termStart),
          termEnd: data.termEnd ? parseDateOnly(data.termEnd) : null,
          notes: data.notes || null,
        },
      })

      if (userId && data.userId) {
        await tx.membership.update({
          where: { userId_orgId: { userId, orgId } },
          data: { isBoardMember: true },
        })
      }
    })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save" }
  }

  revalidateBoardPaths()
  return { success: true }
}

export async function deleteBoardPosition(id: string) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") return { success: false }

  const position = await db.boardPosition.findUnique({ where: { id } })
  if (!position || position.orgId !== session.user.orgId) return { success: false }

  await db.boardPosition.delete({ where: { id } })

  revalidateBoardPaths()
  return { success: true }
}
