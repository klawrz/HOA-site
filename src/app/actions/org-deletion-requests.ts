"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { getFullOrgDataExport } from "@/lib/reports-data"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

export async function requestOrgDeletion(orgId: string, confirmName: string, reason?: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) throw new Error("Organization not found")
  if (confirmName.trim() !== org.name) throw new Error("Name doesn't match")

  const existing = await db.orgDeletionRequest.findFirst({ where: { orgId, status: "PENDING" } })
  if (existing) throw new Error("A deletion request is already pending for this organization")

  await db.orgDeletionRequest.create({
    data: {
      orgId: org.id,
      orgName: org.name,
      orgSlug: org.slug,
      requestedById: session.user.id,
      requestedByEmail: session.user.email ?? "",
      reason: reason?.trim() || null,
    },
  })

  revalidatePath(`/platform-admin/${orgId}`)
  revalidatePath("/platform-admin/deletion-requests")
  return { success: true }
}

export async function cancelOrgDeletionRequest(requestId: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const request = await db.orgDeletionRequest.findUnique({ where: { id: requestId } })
  if (!request || request.status !== "PENDING") throw new Error("Request not found or no longer pending")

  await db.orgDeletionRequest.delete({ where: { id: requestId } })
  revalidatePath(`/platform-admin/${request.orgId}`)
  revalidatePath("/platform-admin/deletion-requests")
  return { success: true }
}

// Fires once both signatures are in. Moves to APPROVED first (so a failure
// partway through - e.g. the disk write - leaves a visibly "approved but
// not yet executed" record instead of silently looking like nothing
// happened), then generates the full backup export and only then deletes
// the org. The backup file lives outside the org's own data (see schema
// comment on OrgDeletionRequest) so it survives the deletion it documents.
async function maybeExecute(requestId: string) {
  const request = await db.orgDeletionRequest.findUnique({ where: { id: requestId } })
  if (!request || request.status !== "PENDING") return
  if (!request.accountOwnerApprovedAt || !request.boardMemberApprovedAt) return

  await db.orgDeletionRequest.update({ where: { id: requestId }, data: { status: "APPROVED" } })

  const data = await getFullOrgDataExport(request.orgId)
  const dir = path.join(process.cwd(), "public", "uploads", "org-backups")
  await mkdir(dir, { recursive: true })
  const filename = `${request.orgSlug}-${Date.now()}.json`
  await writeFile(path.join(dir, filename), JSON.stringify(data, null, 2))
  const backupFileUrl = `/uploads/org-backups/${filename}`

  await db.organization.delete({ where: { id: request.orgId } })

  await db.orgDeletionRequest.update({
    where: { id: requestId },
    data: { status: "COMPLETED", backupFileUrl, completedAt: new Date() },
  })

  revalidatePath("/platform-admin")
  revalidatePath("/platform-admin/deletion-requests")
}

// Approving fills exactly one of the two signature slots per call, and a
// single person can never fill both - the whole point of the rule is two
// distinct people signing off, not one person clicking twice.
export async function approveOrgDeletion(requestId: string) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")

  const request = await db.orgDeletionRequest.findUnique({ where: { id: requestId } })
  if (!request || request.orgId !== session.user.orgId) throw new Error("Not found")
  if (request.status !== "PENDING") throw new Error("This request is no longer pending")

  const isAccountOwner = session.user.role === "ACCOUNT_OWNER"
  const isBoardMember = session.user.role === "BOARD_MEMBER" || session.user.isBoardMember === true
  if (!isAccountOwner && !isBoardMember) {
    throw new Error("Only the Account Owner or a Board Member can approve this")
  }

  if (isAccountOwner && !request.accountOwnerApprovedAt) {
    await db.orgDeletionRequest.update({
      where: { id: requestId },
      data: {
        accountOwnerApprovedById: session.user.id,
        accountOwnerApprovedByName: session.user.name ?? null,
        accountOwnerApprovedByEmail: session.user.email ?? "",
        accountOwnerApprovedAt: new Date(),
      },
    })
  } else if (
    isBoardMember &&
    !request.boardMemberApprovedAt &&
    request.accountOwnerApprovedById !== session.user.id
  ) {
    await db.orgDeletionRequest.update({
      where: { id: requestId },
      data: {
        boardMemberApprovedById: session.user.id,
        boardMemberApprovedByName: session.user.name ?? null,
        boardMemberApprovedByEmail: session.user.email ?? "",
        boardMemberApprovedAt: new Date(),
      },
    })
  }

  await maybeExecute(requestId)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/account")
  revalidatePath("/dashboard/board")
  return { success: true }
}

export async function denyOrgDeletion(requestId: string, reason?: string) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")

  const request = await db.orgDeletionRequest.findUnique({ where: { id: requestId } })
  if (!request || request.orgId !== session.user.orgId) throw new Error("Not found")
  if (request.status !== "PENDING") throw new Error("This request is no longer pending")

  const isAccountOwner = session.user.role === "ACCOUNT_OWNER"
  const isBoardMember = session.user.role === "BOARD_MEMBER" || session.user.isBoardMember === true
  if (!isAccountOwner && !isBoardMember) {
    throw new Error("Only the Account Owner or a Board Member can respond to this")
  }

  await db.orgDeletionRequest.update({
    where: { id: requestId },
    data: {
      status: "DENIED",
      deniedById: session.user.id,
      deniedByName: session.user.name ?? null,
      deniedByEmail: session.user.email ?? "",
      deniedAt: new Date(),
      denialReason: reason?.trim() || null,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/account")
  revalidatePath("/dashboard/board")
  return { success: true }
}
