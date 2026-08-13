"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { saveUploadedFile } from "@/lib/file-upload"

export async function requestOrgVerification(data: {
  legalEntityName?: string
  registrationNumber?: string
  evidenceNotes?: string
  evidenceFile?: File | null
}) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")

  const org = await db.organization.findUnique({ where: { id: session.user.orgId }, select: { verificationStatus: true } })
  if (org?.verificationStatus === "VERIFIED") throw new Error("This organization is already verified")

  const existing = await db.orgVerificationRequest.findFirst({
    where: { orgId: session.user.orgId, status: "PENDING" },
  })
  if (existing) throw new Error("A verification request is already pending for this organization")

  let evidenceFileUrl: string | null = null
  if (data.evidenceFile && data.evidenceFile.size > 0) {
    const result = await saveUploadedFile(data.evidenceFile, "verification-evidence")
    if (!result.success) throw new Error(result.error)
    evidenceFileUrl = result.url
  }

  await db.orgVerificationRequest.create({
    data: {
      orgId: session.user.orgId,
      requestedById: session.user.id,
      requestedByName: session.user.name ?? "",
      requestedByEmail: session.user.email ?? "",
      legalEntityName: data.legalEntityName?.trim() || null,
      registrationNumber: data.registrationNumber?.trim() || null,
      evidenceNotes: data.evidenceNotes?.trim() || null,
      evidenceFileUrl,
    },
  })

  revalidatePath("/dashboard/account/verification")
  revalidatePath("/platform-admin/verification-requests")
  return { success: true }
}

// The floor is enforced here, not earlier - the whole point of "official
// activation only after at least two custodians" is that it's checked at
// the moment of verification, not left as an unenforced expectation.
export async function approveOrgVerification(requestId: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const request = await db.orgVerificationRequest.findUnique({ where: { id: requestId } })
  if (!request || request.status !== "PENDING") throw new Error("Request not found or no longer pending")

  const custodianCount = await db.membership.count({
    where: { orgId: request.orgId, role: "ACCOUNT_OWNER" },
  })
  if (custodianCount < 2) {
    throw new Error(
      "This organization needs at least two custodians before it can be verified - ask them to invite or promote a second custodian first."
    )
  }

  await db.$transaction([
    db.organization.update({
      where: { id: request.orgId },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        verifiedByName: session.user.name ?? null,
        verifiedByEmail: session.user.email ?? null,
      },
    }),
    db.orgVerificationRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedById: session.user.id,
        reviewedByName: session.user.name ?? null,
        reviewedByEmail: session.user.email ?? "",
        reviewedAt: new Date(),
      },
    }),
  ])

  revalidatePath("/platform-admin/verification-requests")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/account")
  return { success: true }
}

export async function denyOrgVerification(requestId: string, reason?: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const request = await db.orgVerificationRequest.findUnique({ where: { id: requestId } })
  if (!request || request.status !== "PENDING") throw new Error("Request not found or no longer pending")

  await db.orgVerificationRequest.update({
    where: { id: requestId },
    data: {
      status: "DENIED",
      reviewedById: session.user.id,
      reviewedByName: session.user.name ?? null,
      reviewedByEmail: session.user.email ?? "",
      reviewedAt: new Date(),
      reviewNotes: reason?.trim() || null,
    },
  })

  revalidatePath("/platform-admin/verification-requests")
  revalidatePath("/dashboard/account/verification")
  return { success: true }
}
