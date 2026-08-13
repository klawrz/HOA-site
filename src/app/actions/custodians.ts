"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { createInviteForOrg } from "@/app/actions/invites"

// A VERIFIED org must never again be controlled by one person - this is
// the floor stepDownAsCustodian enforces below. A PROVISIONAL workspace is
// still allowed to run on a single custodian (that's the whole point of
// low-friction self-serve setup).
const VERIFIED_CUSTODIAN_FLOOR = 2

// Deliberately kept out of the general InvitePanel's role dropdown (which
// never lists ACCOUNT_OWNER) so adding a custodian stays its own
// deliberate action rather than one option among many. Adding a custodian
// only ever expands the custodian set, so no extra approval gate is needed
// beyond "caller is already a custodian" - the sensitive direction is
// removal, handled by stepDownAsCustodian below.
export async function inviteCustodian(email: string) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")
  const orgId = session.user.orgId

  const trimmed = email.trim().toLowerCase()
  if (!trimmed) throw new Error("Email is required")

  await createInviteForOrg({ email: trimmed, role: "ACCOUNT_OWNER", orgId })
  revalidatePath("/dashboard/account")
  return { success: true }
}

// Changing role (rather than adding a second role) matches this schema's
// existing one-role-per-Membership model. isBoardMember is a separate
// field and is left untouched, so a promoted Board Member keeps that flag
// - giving "board-linked custodian" for free with no new field.
export async function promoteToCustodian(membershipId: string) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")
  const orgId = session.user.orgId

  const target = await db.membership.findUnique({ where: { id: membershipId } })
  if (!target || target.orgId !== orgId) throw new Error("Member not found")
  if (target.role === "ACCOUNT_OWNER") throw new Error("This member is already a custodian")

  await db.membership.update({ where: { id: membershipId }, data: { role: "ACCOUNT_OWNER" } })
  revalidatePath("/dashboard/account")
  return { success: true }
}

// Self-removal only - removing another custodian unilaterally is a
// control-transfer-shaped action, deliberately deferred to a future
// dual-approval phase rather than half-built here. A platform admin can
// still remove a custodian directly for abuse/dispute cases under their
// existing suspension/deletion authority.
export async function stepDownAsCustodian() {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")
  const orgId = session.user.orgId
  const userId = session.user.id

  const [org, custodianCount] = await Promise.all([
    db.organization.findUnique({ where: { id: orgId }, select: { verificationStatus: true } }),
    db.membership.count({ where: { orgId, role: "ACCOUNT_OWNER" } }),
  ])

  if (org?.verificationStatus === "VERIFIED" && custodianCount - 1 < VERIFIED_CUSTODIAN_FLOOR) {
    throw new Error(
      "A verified organization must always have at least two custodians - invite or promote a successor before stepping down."
    )
  }

  await db.membership.delete({ where: { userId_orgId: { userId, orgId } } })
  revalidatePath("/dashboard/account")
  return { success: true }
}
