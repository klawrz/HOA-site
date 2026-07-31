"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Phone, Mail, User as UserIcon, AlertTriangle } from "lucide-react"
import { NewPMContractDialog } from "@/app/dashboard/account/pm/new-pm-contract-dialog"
import { ApprovePMContractDialog } from "./approve-pm-contract-dialog"
import { endPMContract } from "@/app/actions/pm"
import { formatDateTime } from "@/lib/utils"

const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  ENDED: "bg-gray-100 text-gray-600",
}

const entityTypeLabel: Record<string, string> = {
  COMPANY: "Company",
  INDIVIDUAL: "Individual",
}

function addressLines(c: {
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}) {
  const line2 = [c.city, c.state, c.postalCode].filter(Boolean).join(", ")
  return [c.addressLine1, c.addressLine2, line2, c.country].filter(Boolean)
}

interface PMContractRow {
  id: string
  status: "ACTIVE" | "PENDING" | "ENDED"
  startDate: Date
  endDate: Date | null
  responsibilities: string
  terminationTerms: string
  terms: string | null
  approvedAt: Date | null
  createdBy: { name: string | null; email: string }
  approvedBy: { name: string | null; email: string } | null
  company: {
    id: string
    entityType: string
    legalName: string
    email: string | null
    phone: string | null
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
    primaryContactName: string | null
    primaryContactEmail: string | null
    primaryContactPhone: string | null
    emergencyContacts: { id: string; name: string; role: string | null; phone: string; email: string | null }[]
  }
}

interface MeetingOption {
  id: string
  title: string
  date: Date
}

export function PMContractBoard({
  contracts,
  companies,
  meetings,
  canManage,
  canApprove,
}: {
  contracts: PMContractRow[]
  companies: { id: string; legalName: string }[]
  meetings: MeetingOption[]
  canManage: boolean
  canApprove: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property Manager</h1>
          <p className="text-gray-500 mt-1">
            The property management company (or individual) contracted by this association
          </p>
        </div>
        {canManage && (
          <NewPMContractDialog companies={companies.map((c) => ({ id: c.id, legalName: c.legalName }))} />
        )}
      </div>

      <div className="space-y-3">
        {contracts.map((c) => (
          <PMContractCard key={c.id} contract={c} meetings={meetings} canManage={canManage} canApprove={canApprove} />
        ))}

        {contracts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No property manager on file yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function PMContractCard({
  contract: c,
  meetings,
  canManage,
  canApprove,
}: {
  contract: PMContractRow
  meetings: MeetingOption[]
  canManage: boolean
  canApprove: boolean
}) {
  const [ending, startEndTransition] = useTransition()

  function handleEnd() {
    startEndTransition(async () => {
      const result = await endPMContract(c.id)
      if (!result.success) toast.error("Failed to end contract")
    })
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">
                {c.company.legalName}
                <span className="text-xs font-normal text-gray-400 ml-1.5">
                  ({entityTypeLabel[c.company.entityType]})
                </span>
              </p>
              {c.company.email && <p className="text-sm text-gray-500">{c.company.email}</p>}
              {c.company.phone && <p className="text-sm text-gray-500">{c.company.phone}</p>}
              {addressLines(c.company).map((line, i) => (
                <p key={i} className="text-sm text-gray-500">{line}</p>
              ))}
              <p className="text-xs text-gray-400 mt-2">
                Contracted since {formatDateTime(c.startDate)}
                {c.endDate && ` · Ends ${formatDateTime(c.endDate)}`}
              </p>
              <p className="text-xs text-gray-400">
                Submitted by {c.createdBy.name ?? c.createdBy.email}
                {c.approvedAt && c.approvedBy && (
                  <> · Approved by {c.approvedBy.name ?? c.approvedBy.email} on {formatDateTime(c.approvedAt)}</>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[c.status]}`}>
              {c.status}
            </span>
            {c.status === "PENDING" && canApprove && (
              <ApprovePMContractDialog contractId={c.id} meetings={meetings} />
            )}
            {c.status !== "ENDED" && canManage && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={handleEnd}
                disabled={ending}
              >
                {ending ? "Ending..." : "End Contract"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Responsibilities</p>
            <p className="text-sm whitespace-pre-line">{c.responsibilities}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Termination &amp; Transfer of Control</p>
            <p className="text-sm whitespace-pre-line">{c.terminationTerms}</p>
          </div>
        </div>
        {c.terms && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Other Terms</p>
            <p className="text-sm whitespace-pre-line">{c.terms}</p>
          </div>
        )}

        {c.company.primaryContactName && (
          <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
            <UserIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500">
                {c.company.entityType === "INDIVIDUAL" ? "Key Person" : "Primary Contact"}
              </p>
              <p className="text-sm font-semibold">{c.company.primaryContactName}</p>
              {c.company.primaryContactPhone && (
                <p className="text-xs text-gray-500">{c.company.primaryContactPhone}</p>
              )}
              {c.company.primaryContactEmail && (
                <p className="text-xs text-gray-500">{c.company.primaryContactEmail}</p>
              )}
            </div>
          </div>
        )}

        {c.company.emergencyContacts.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs font-medium text-red-700 flex items-center gap-1 mb-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Emergency Contacts
            </p>
            <div className="space-y-2">
              {c.company.emergencyContacts.map((ec) => (
                <div key={ec.id} className="text-sm">
                  <p className="font-medium">
                    {ec.name}
                    {ec.role && <span className="text-gray-500 font-normal"> · {ec.role}</span>}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {ec.phone}</span>
                    {ec.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {ec.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
