import type { Prisma } from "@/generated/prisma"

// Shared by src/app/actions/unit-ownership.ts (the seller-confirmation and
// cancel actions) and src/lib/accept-invite.ts (the buyer's confirmation,
// via accepting the linked Invite) - deliberately NOT in the "use server"
// actions file itself, since every export of a "use server" file must be
// an async function Next can wire up as a client-callable action, and this
// takes a non-serializable Prisma transaction client as its first
// argument (same class of issue that broke a previous build this session
// when a plain sync helper lived in a "use server" file).
//
// Executes the actual UnitOwnership change only once every required party
// has confirmed: every current owner at proposal time (sellerConfirmations,
// snapshotted so a later unrelated change elsewhere can't retroactively
// add/remove who must sign off) AND the new owner, whose confirmation is
// just accepting the real Invite this request created.
export async function tryCompleteOwnershipTransfer(
  tx: Prisma.TransactionClient,
  requestId: string,
  opts: { buyerConfirmedNow?: boolean } = {}
) {
  const request = await tx.ownershipTransferRequest.findUnique({
    where: { id: requestId },
    include: { sellerConfirmations: true, invite: true },
  })
  if (!request || request.status !== "PENDING") return

  const allSellersConfirmed = request.sellerConfirmations.every((c) => c.confirmedAt !== null)
  // buyerConfirmedNow covers the case where this is being called FROM
  // inside the buyer's own acceptance transaction, before invite.acceptedAt
  // has actually been written yet - the buyer confirming is the entire
  // reason this code path is running, so it's true by construction there.
  const buyerConfirmed = opts.buyerConfirmedNow === true || request.invite?.acceptedAt != null
  if (!allSellersConfirmed || !buyerConfirmed) return

  const buyer = await tx.user.findUnique({ where: { email: request.invite!.email } })
  if (!buyer) return // shouldn't happen - the invite's acceptance always creates/finds this user first

  await tx.unitOwnership.updateMany({
    where: { unitId: request.unitId, isCurrent: true },
    data: { isCurrent: false, divestedAt: request.since },
  })
  await tx.unitOwnership.create({ data: { unitId: request.unitId, ownerId: buyer.id, since: request.since } })
  await tx.unit.update({ where: { id: request.unitId }, data: { status: "OWNER_OCCUPIED" } })
  await tx.ownershipTransferRequest.update({ where: { id: requestId }, data: { status: "CONFIRMED", completedAt: new Date() } })
}
