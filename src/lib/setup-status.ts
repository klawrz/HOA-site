import { db } from "@/lib/db"

// Computed status for the cross-role setup chains that today's onboarding
// checklist (src/lib/onboarding-steps.ts) doesn't model - that system is a
// per-user "have you visited this page" tracker, while these are per-org
// facts derived from real records, often blocked on a DIFFERENT person's
// action. `actor` names who can actually move each one forward, which is
// the piece that was missing from the old flat empty-state strings.
export type SetupStatus =
  | { state: "not_started"; nextAction: string; actor: string[] }
  | { state: "pending"; detail: string; nextAction: string; actor: string[] }
  | { state: "blocked"; reason: string; nextAction: string; actor: string[] }
  | { state: "done"; detail?: string }

// Renders any non-done SetupStatus as one sentence naming what's missing
// and who can act - shared so empty-state copy stays consistent wherever
// a status gets surfaced.
export function setupStatusMessage(status: SetupStatus): string {
  if (status.state === "done") return ""
  const lead = status.state === "pending" ? status.detail : status.state === "blocked" ? status.reason : null
  return lead ? `${lead} — ${status.nextAction}.` : `${status.nextAction}.`
}

export async function getUnitsSetupStatus(orgId: string): Promise<SetupStatus> {
  const unitCount = await db.unit.count({ where: { orgId } })
  if (unitCount > 0) return { state: "done", detail: `${unitCount} unit${unitCount !== 1 ? "s" : ""} on file` }

  return {
    state: "not_started",
    nextAction: "Add at least one unit, by hand or by importing a document",
    actor: ["ACCOUNT_OWNER"],
  }
}

export async function getMembersSetupStatus(orgId: string): Promise<SetupStatus> {
  const acceptedOwners = await db.membership.count({ where: { orgId, role: "OWNER" } })
  if (acceptedOwners > 0) {
    return { state: "done", detail: `${acceptedOwners} Owner${acceptedOwners !== 1 ? "s" : ""} on the roster` }
  }

  const pendingOwnerInvites = await db.invite.count({ where: { orgId, role: "OWNER", acceptedAt: null } })
  if (pendingOwnerInvites > 0) {
    return {
      state: "pending",
      detail: `${pendingOwnerInvites} Owner invite${pendingOwnerInvites !== 1 ? "s" : ""} sent but not yet accepted`,
      nextAction: "Wait for them to accept, or send more invites",
      actor: ["ACCOUNT_OWNER"],
    }
  }

  // Staged roster entries (see PendingOwner in schema.prisma) are owners
  // the custodian has added but deliberately hasn't sent an invite for yet
  // - real content, just not "done" the way an accepted membership is.
  const stagedOwners = await db.pendingOwner.count({ where: { orgId } })
  if (stagedOwners > 0) {
    return {
      state: "pending",
      detail: `${stagedOwners} Owner${stagedOwners !== 1 ? "s" : ""} on the roster but not yet invited`,
      nextAction: "Send their invite whenever you're ready",
      actor: ["ACCOUNT_OWNER"],
    }
  }

  return {
    state: "not_started",
    nextAction: "Add your Owners, by hand or by importing a document",
    actor: ["ACCOUNT_OWNER"],
  }
}

export async function getPMSetupStatus(orgId: string): Promise<SetupStatus> {
  const activeContract = await db.pMContract.findFirst({
    where: { orgId, status: "ACTIVE" },
    include: { company: true },
    orderBy: { startDate: "desc" },
  })
  if (activeContract) return { state: "done", detail: activeContract.company.legalName }

  const pendingContract = await db.pMContract.findFirst({
    where: { orgId, status: "PENDING" },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  })
  if (pendingContract) {
    return {
      state: "pending",
      detail: `${pendingContract.company.legalName} is pending Board approval`,
      nextAction: "A Board Member needs to approve the contract",
      actor: ["BOARD_MEMBER"],
    }
  }

  const staffWithCompany = await db.pMStaffMembership.findFirst({
    where: { user: { memberships: { some: { orgId, role: "PROPERTY_MANAGER" } } } },
    include: { company: true },
  })
  if (staffWithCompany) {
    return {
      state: "blocked",
      reason: `${staffWithCompany.company.legalName} has a profile but no contract yet`,
      nextAction: "An Account Owner or Board Member needs to create a contract for them",
      actor: ["ACCOUNT_OWNER", "BOARD_MEMBER"],
    }
  }

  const hasPM = await db.membership.findFirst({ where: { orgId, role: "PROPERTY_MANAGER" } })
  return {
    state: "not_started",
    nextAction: hasPM
      ? "The invited Property Manager needs to fill in their Company Profile"
      : "Invite a Property Manager to get started",
    actor: hasPM ? ["PROPERTY_MANAGER"] : ["ACCOUNT_OWNER"],
  }
}

export async function getDuesSetupStatus(orgId: string): Promise<SetupStatus> {
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { verificationStatus: true } })
  if (org?.verificationStatus !== "VERIFIED") {
    return {
      state: "blocked",
      reason: "This workspace isn't verified yet",
      nextAction: "An Account Owner needs to request verification",
      actor: ["ACCOUNT_OWNER"],
    }
  }

  const issued = await db.assessment.findFirst({ where: { orgId, status: "ISSUED" } })
  if (issued) return { state: "done" }

  const draft = await db.assessment.findFirst({ where: { orgId, status: "DRAFT" } })
  if (draft) {
    return {
      state: "pending",
      detail: `"${draft.title}" has been drafted but not issued`,
      nextAction: "A Board Member needs to issue it",
      actor: ["BOARD_MEMBER"],
    }
  }

  const unitCount = await db.unit.count({ where: { orgId } })
  if (unitCount === 0) {
    return {
      state: "not_started",
      nextAction: "Add at least one unit before dues can be assessed",
      actor: ["ACCOUNT_OWNER"],
    }
  }

  return {
    state: "not_started",
    nextAction: "A Board Member or Property Manager needs to draft an assessment",
    actor: ["BOARD_MEMBER", "PROPERTY_MANAGER"],
  }
}

export async function getVerificationSetupStatus(orgId: string): Promise<SetupStatus> {
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { verificationStatus: true } })
  if (org?.verificationStatus === "VERIFIED") return { state: "done" }

  const pendingRequest = await db.orgVerificationRequest.findFirst({ where: { orgId, status: "PENDING" } })
  if (pendingRequest) {
    return {
      state: "pending",
      detail: "A verification request is awaiting review",
      nextAction: "A platform admin needs to review it",
      actor: ["Platform Admin"],
    }
  }

  const custodianCount = await db.membership.count({ where: { orgId, role: "ACCOUNT_OWNER" } })
  if (custodianCount < 2) {
    return {
      state: "not_started",
      nextAction: "Invite a second custodian, then request verification - approval requires at least two",
      actor: ["ACCOUNT_OWNER"],
    }
  }

  return {
    state: "not_started",
    nextAction: "Request verification",
    actor: ["ACCOUNT_OWNER"],
  }
}

export async function getBudgetSetupStatus(orgId: string): Promise<SetupStatus> {
  const approved = await db.budget.findFirst({ where: { orgId, status: "APPROVED", type: "OPERATING" } })
  if (approved) return { state: "done", detail: `${approved.year} operating budget` }

  const draft = await db.budget.findFirst({ where: { orgId, status: "DRAFT", type: "OPERATING" } })
  if (draft) {
    return {
      state: "pending",
      detail: `${draft.year} operating budget has been drafted but not approved`,
      nextAction: "A Board Member needs to approve it",
      actor: ["BOARD_MEMBER"],
    }
  }

  return {
    state: "not_started",
    nextAction: "A Board Member or Property Manager needs to draft an operating budget",
    actor: ["BOARD_MEMBER", "PROPERTY_MANAGER"],
  }
}

export async function getBoardRosterSetupStatus(orgId: string): Promise<SetupStatus> {
  const boardMemberCount = await db.membership.count({
    where: { orgId, OR: [{ role: "BOARD_MEMBER" }, { isBoardMember: true }] },
  })
  const totalPositions = await db.boardPosition.count({ where: { orgId } })
  const filledPositions = await db.boardPosition.count({ where: { orgId, userId: { not: null } } })

  if (totalPositions === 0) {
    return {
      state: "not_started",
      nextAction: boardMemberCount > 0 ? "A Board Member can add themselves to the roster" : "Invite Board Members or pre-declare seats",
      actor: boardMemberCount > 0 ? ["BOARD_MEMBER"] : ["ACCOUNT_OWNER"],
    }
  }

  if (boardMemberCount > filledPositions) {
    return {
      state: "pending",
      detail: `${filledPositions} of ${boardMemberCount} Board Members have a roster seat`,
      nextAction: "The remaining Board Member(s) can add themselves",
      actor: ["BOARD_MEMBER"],
    }
  }

  return { state: "done", detail: `${totalPositions} seat${totalPositions !== 1 ? "s" : ""} on record` }
}

export async function getUnitManagerSetupStatus(orgId: string): Promise<SetupStatus> {
  const acceptedInvites = await db.invite.count({
    where: { orgId, role: "UNIT_MANAGER", acceptedAt: { not: null } },
  })
  if (acceptedInvites === 0) {
    return {
      state: "not_started",
      nextAction: "Optional - an Owner can delegate a Unit Manager from their unit's profile page",
      actor: ["OWNER"],
    }
  }

  const assignments = await db.unitManagerAssignment.findMany({
    where: { unit: { orgId }, userId: { not: null } },
    include: { grants: true },
  })
  const withoutGrants = assignments.filter((a) => a.grants.length === 0)
  if (withoutGrants.length > 0) {
    return {
      state: "pending",
      detail: `${withoutGrants.length} of ${assignments.length} assigned Unit Manager(s) have no capabilities granted yet`,
      nextAction: "The delegating Owner needs to grant at least one capability area",
      actor: ["OWNER"],
    }
  }

  return { state: "done", detail: `${assignments.length} Unit Manager assignment${assignments.length !== 1 ? "s" : ""}` }
}
