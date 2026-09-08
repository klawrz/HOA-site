import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BankInfoCard } from "@/components/key-info/bank-info-card"
import { canPreviewRole } from "@/lib/role-access"

export default async function PMBankingPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  const [org, insuranceContract] = await Promise.all([
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    db.contract.findFirst({
      where: {
        orgId: session.user.orgId ?? undefined,
        scope: "PROPERTY",
        status: "ACTIVE",
        OR: [{ contractor: { category: "INSURANCE" } }, { title: { contains: "insurance" } }],
      },
      include: { contractor: true },
      orderBy: { startDate: "desc" },
    }),
  ])

  const canManage =
    session.user.role === "BOARD_MEMBER" ||
    session.user.role === "PROPERTY_MANAGER" ||
    session.user.isBoardMember

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Banking &amp; Insurance</h1>
        <p className="text-gray-500 mt-1">
          Where the HOA banks, how dues are paid, proof of coverage, and the property address
        </p>
      </div>

      <BankInfoCard
        bank={{
          bankName: org?.bankName ?? null,
          bankAddress: org?.bankAddress ?? null,
          bankPhone: org?.bankPhone ?? null,
          bankAccountName: org?.bankAccountName ?? null,
          bankSigningAuthority: org?.bankSigningAuthority ?? null,
          bankPaymentInstructions: org?.bankPaymentInstructions ?? null,
          bankContactName: org?.bankContactName ?? null,
          bankContactPhone: org?.bankContactPhone ?? null,
          bankContactEmail: org?.bankContactEmail ?? null,
        }}
        address={{
          addressLine1: org?.addressLine1 ?? null,
          addressLine2: org?.addressLine2 ?? null,
          city: org?.city ?? null,
          state: org?.state ?? null,
          postalCode: org?.postalCode ?? null,
          country: org?.country ?? null,
        }}
        canManage={canManage}
        insuranceHref="/dashboard/property-manager/contracts"
        insurance={
          insuranceContract
            ? {
                insurerName:
                  insuranceContract.contractor.company ??
                  insuranceContract.contractor.name ??
                  insuranceContract.contractor.email ??
                  "Unknown insurer",
                startDate: insuranceContract.startDate,
                endDate: insuranceContract.endDate,
                amount: insuranceContract.amount,
                billingPeriod: insuranceContract.billingPeriod,
                reminderDaysBefore: insuranceContract.reminderDaysBefore,
              }
            : null
        }
      />
    </div>
  )
}
