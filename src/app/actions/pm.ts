"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { PMAccessArea, PMAccessLevel, PMContractStatus } from "@/generated/prisma"
import { revalidatePath } from "next/cache"

async function getOwnCompany(userId: string) {
  const membership = await db.pMStaffMembership.findFirst({
    where: { userId },
    include: { company: true },
  })
  return membership?.company ?? null
}

// Only the person who registered the company can manage its profile and
// staff roster for now - a simple bootstrapping rule rather than a fixed
// role tier, since per-org access grants (below) are where the real
// span-of-control flexibility lives.
async function requireCompanyAdmin(companyId: string, userId: string) {
  const company = await db.propertyManagementCompany.findUnique({ where: { id: companyId } })
  return company?.createdById === userId ? company : null
}

export async function createOrUpdateCompanyProfile(data: {
  legalName: string
  registrationId?: string
  email?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  primaryContactName?: string
  primaryContactEmail?: string
  primaryContactPhone?: string
}) {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") return { success: false }

  const existing = await getOwnCompany(session.user.id)

  const fields = {
    legalName: data.legalName,
    registrationId: data.registrationId || null,
    email: data.email || null,
    phone: data.phone || null,
    addressLine1: data.addressLine1 || null,
    addressLine2: data.addressLine2 || null,
    city: data.city || null,
    state: data.state || null,
    postalCode: data.postalCode || null,
    country: data.country || null,
    primaryContactName: data.primaryContactName || null,
    primaryContactEmail: data.primaryContactEmail || null,
    primaryContactPhone: data.primaryContactPhone || null,
  }

  if (existing) {
    if (existing.createdById !== session.user.id) return { success: false }
    await db.propertyManagementCompany.update({
      where: { id: existing.id },
      data: fields,
    })
  } else {
    await db.propertyManagementCompany.create({
      data: {
        ...fields,
        createdById: session.user.id,
        staff: { create: { userId: session.user.id } },
      },
    })
  }

  revalidatePath("/dashboard/property-manager/company")
  return { success: true }
}

export async function addStaffMember(userEmail: string) {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") return { success: false }

  const company = await getOwnCompany(session.user.id)
  if (!company || !(await requireCompanyAdmin(company.id, session.user.id))) {
    return { success: false }
  }

  const user = await db.user.findUnique({ where: { email: userEmail } })
  if (!user || user.role !== "PROPERTY_MANAGER") {
    return { success: false, error: "No Property Manager account found with that email" }
  }

  const alreadyStaff = await db.pMStaffMembership.findUnique({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
  })
  if (alreadyStaff) return { success: false, error: "Already on staff" }

  await db.pMStaffMembership.create({ data: { companyId: company.id, userId: user.id } })

  revalidatePath("/dashboard/property-manager/staff")
  return { success: true }
}

export async function removeStaffMember(membershipId: string) {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") return { success: false }

  const membership = await db.pMStaffMembership.findUnique({ where: { id: membershipId } })
  if (!membership) return { success: false }
  if (membership.userId === session.user.id) return { success: false, error: "Cannot remove yourself" }
  if (!(await requireCompanyAdmin(membership.companyId, session.user.id))) return { success: false }

  await db.pMStaffMembership.delete({ where: { id: membershipId } })

  revalidatePath("/dashboard/property-manager/staff")
  return { success: true }
}

export async function setAccessGrant(
  membershipId: string,
  orgId: string,
  area: PMAccessArea,
  level: PMAccessLevel | null
) {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") return { success: false }

  const membership = await db.pMStaffMembership.findUnique({ where: { id: membershipId } })
  if (!membership) return { success: false }
  if (!(await requireCompanyAdmin(membership.companyId, session.user.id))) return { success: false }

  if (level === null) {
    await db.pMAccessGrant.deleteMany({ where: { membershipId, orgId, area } })
  } else {
    await db.pMAccessGrant.upsert({
      where: { membershipId_orgId_area: { membershipId, orgId, area } },
      create: { membershipId, orgId, area, level },
      update: { level },
    })
  }

  revalidatePath("/dashboard/property-manager/staff")
  return { success: true }
}

export async function createPMContract(data: {
  companyId: string
  startDate: string
  endDate?: string
  terms?: string
}) {
  const session = await auth()
  if (!session || session.user.role !== "ACCOUNT_OWNER" || !session.user.orgId) return { success: false }

  await db.pMContract.create({
    data: {
      companyId: data.companyId,
      orgId: session.user.orgId,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      terms: data.terms || null,
      status: "ACTIVE",
    },
  })

  revalidatePath("/dashboard/account/pm")
  return { success: true }
}

export async function updatePMContractStatus(contractId: string, status: PMContractStatus) {
  const session = await auth()
  if (!session || session.user.role !== "ACCOUNT_OWNER") return { success: false }

  const contract = await db.pMContract.findUnique({ where: { id: contractId } })
  if (!contract || contract.orgId !== session.user.orgId) return { success: false }

  await db.pMContract.update({ where: { id: contractId }, data: { status } })

  revalidatePath("/dashboard/account/pm")
  return { success: true }
}

export async function addEmergencyContact(data: {
  name: string
  role?: string
  phone: string
  email?: string
  notes?: string
}) {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") return { success: false }

  const company = await getOwnCompany(session.user.id)
  if (!company || !(await requireCompanyAdmin(company.id, session.user.id))) return { success: false }

  await db.pMEmergencyContact.create({
    data: {
      companyId: company.id,
      name: data.name,
      role: data.role || null,
      phone: data.phone,
      email: data.email || null,
      notes: data.notes || null,
    },
  })

  revalidatePath("/dashboard/property-manager/company")
  revalidatePath("/dashboard/account/pm")
  return { success: true }
}

export async function removeEmergencyContact(contactId: string) {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") return { success: false }

  const contact = await db.pMEmergencyContact.findUnique({ where: { id: contactId } })
  if (!contact) return { success: false }
  if (!(await requireCompanyAdmin(contact.companyId, session.user.id))) return { success: false }

  await db.pMEmergencyContact.delete({ where: { id: contactId } })

  revalidatePath("/dashboard/property-manager/company")
  revalidatePath("/dashboard/account/pm")
  return { success: true }
}
