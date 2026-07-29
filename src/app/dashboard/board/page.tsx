import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Calendar, DollarSign, Building2 } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { documentCategoryColor } from "@/lib/document-styles"

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
  ] = await Promise.all([
    db.meeting.count(),
    db.document.count(),
    db.contract.count(),
    db.unit.count(),
    db.meeting.findMany({
      orderBy: { date: "desc" },
      take: 4,
    }),
    db.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Board of Directors Dashboard</h1>
        <p className="text-gray-500 mt-1">Community governance and institutional memory</p>
      </div>

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
