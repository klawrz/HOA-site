import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PMContractBoard } from "@/components/pm/pm-contract-board"

export default async function BoardPMPage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const [contracts, companies, meetings] = await Promise.all([
    db.pMContract.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { company: { include: { emergencyContacts: true } }, createdBy: true, approvedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.propertyManagementCompany.findMany({ orderBy: { legalName: "asc" } }),
    db.meeting.findMany({ where: { orgId: session.user.orgId ?? undefined }, orderBy: { date: "desc" } }),
  ])

  return (
    <PMContractBoard
      contracts={contracts}
      companies={companies.map((c) => ({ id: c.id, legalName: c.legalName }))}
      meetings={meetings.map((m) => ({ id: m.id, title: m.title, date: m.date }))}
      canManage
      canApprove
    />
  )
}
