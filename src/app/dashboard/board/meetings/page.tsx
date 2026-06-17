import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NewMeetingDialog } from "./new-meeting-dialog"
import { MeetingMinutesDialog } from "./minutes-dialog"

export default async function MeetingsPage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const meetings = await db.meeting.findMany({
    include: { _count: { select: { documents: true } } },
    orderBy: { date: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-gray-500 mt-1">{meetings.length} meetings on record</p>
        </div>
        <NewMeetingDialog />
      </div>

      <div className="space-y-3">
        {meetings.map((m) => (
          <Card key={m.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(m.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {m.location && ` · ${m.location}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.minutes ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Minutes filed
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      Minutes pending
                    </span>
                  )}
                  {m._count.documents > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {m._count.documents} doc{m._count.documents !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {m.agenda && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Agenda</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{m.agenda}</p>
                </div>
              )}
              {m.minutes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Minutes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-3">
                    {m.minutes}
                  </p>
                </div>
              )}
              {m.attendees && (
                <p className="text-xs text-gray-400">Attendees: {m.attendees}</p>
              )}
              <MeetingMinutesDialog meeting={m} />
            </CardContent>
          </Card>
        ))}

        {meetings.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No meetings recorded yet. Create the first one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
