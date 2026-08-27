import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PMContractBoard } from "@/components/pm/pm-contract-board"
import { PMSetupPanel } from "./pm-setup-panel"

export default async function AccountPMPage() {
  const session = await auth()
  if (!session || session.user.role !== "ACCOUNT_OWNER" || !session.user.orgId) redirect("/dashboard")

  const [contracts, companies, meetings, pmInvites] = await Promise.all([
    db.pMContract.findMany({
      where: { orgId: session.user.orgId },
      include: { company: { include: { emergencyContacts: true } }, createdBy: true, approvedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.propertyManagementCompany.findMany({ orderBy: { legalName: "asc" } }),
    db.meeting.findMany({ where: { orgId: session.user.orgId }, orderBy: { date: "desc" } }),
    db.invite.findMany({ where: { orgId: session.user.orgId, role: "PROPERTY_MANAGER" }, orderBy: { createdAt: "desc" } }),
  ])

  return (
    <div className="space-y-8">
      <PMSetupPanel
        pmInvites={pmInvites.map((i) => ({ id: i.id, email: i.email, token: i.token, acceptedAt: i.acceptedAt }))}
      />
      <PMContractBoard
        contracts={contracts}
        companies={companies.map((c) => ({ id: c.id, legalName: c.legalName }))}
        meetings={meetings.map((m) => ({ id: m.id, title: m.title, date: m.date }))}
        canManage
        canApprove={false}
      />
    </div>
  )
}
