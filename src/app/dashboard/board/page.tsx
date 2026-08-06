import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Calendar, DollarSign, Building2 } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { documentCategoryColor } from "@/lib/document-styles"
import { getAttentionItems } from "@/lib/attention"
import { NeedsAttentionPanel } from "@/components/dashboard/needs-attention-panel"
import { BOARD_ONBOARDING_STEPS, BOARD_STEP_IDS, parseCompletedSteps, isOnboardingComplete } from "@/lib/onboarding-steps"
import { OnboardingChecklistCard } from "@/components/onboarding/onboarding-checklist-card"

export default async function BoardDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const [
    meetingCount,
    documentCount,
    contractCount,
    unitCount,
    recentMeetings,
    recentDocs,
    attentionItems,
    ownMembership,
  ] = await Promise.all([
    db.meeting.count({ where: { orgId: session.user.orgId ?? undefined } }),
    db.document.count({ where: { orgId: session.user.orgId ?? undefined } }),
    db.contract.count({ where: { orgId: session.user.orgId ?? undefined } }),
    db.unit.count({ where: { orgId: session.user.orgId ?? undefined } }),
    db.meeting.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      orderBy: { date: "desc" },
      take: 4,
    }),
    db.document.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    session.user.orgId ? getAttentionItems(session.user.orgId, "/dashboard/board") : Promise.resolve([]),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
  ])
  const completedSteps = parseCompletedSteps(ownMembership?.onboardingSteps ?? null)
  const onboardingDone = isOnboardingComplete(ownMembership?.onboardingSteps ?? null, BOARD_STEP_IDS)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Board of Directors Dashboard</h1>
        <p className="text-gray-500 mt-1">Community governance and institutional memory</p>
      </div>

      <OnboardingChecklistCard
        steps={BOARD_ONBOARDING_STEPS}
        completedIds={completedSteps}
        allComplete={onboardingDone}
        welcomeSeen={completedSteps.has("welcome_seen")}
        completionTitle="You are ready to participate in governing your property."
        completionMessage="You know the finances, the reserve fund, where meetings happen, and who to reach. Welcome to the Board."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{meetingCount}</p>
                <p className="text-xs text-gray-500">Meetings on Record</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{documentCount}</p>
                <p className="text-xs text-gray-500">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{contractCount}</p>
                <p className="text-xs text-gray-500">Contracts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{unitCount}</p>
                <p className="text-xs text-gray-500">Total Units</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <NeedsAttentionPanel items={attentionItems} />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Meetings</CardTitle>
            <Link href="/dashboard/board/meetings" className={cn(buttonVariants({ size: "sm" }))}>View All</Link>
          </CardHeader>
          <CardContent>
            {recentMeetings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No meetings recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(m.date).toLocaleDateString()}
                        {m.location && ` · ${m.location}`}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        m.minutes
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {m.minutes ? "Minutes filed" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Documents</CardTitle>
            <Link href="/dashboard/board/documents" className={cn(buttonVariants({ size: "sm" }))}>View All</Link>
          </CardHeader>
          <CardContent>
            {recentDocs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No documents yet.</p>
            ) : (
              <div className="space-y-2">
                {recentDocs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${documentCategoryColor[d.category]}`}
                    >
                      {d.category.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
