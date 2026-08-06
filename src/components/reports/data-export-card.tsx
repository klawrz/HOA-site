"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Download, DatabaseBackup } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { exportFullOrgData } from "@/app/actions/reports"

export function DataExportCard({ orgName }: { orgName: string }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    const result = await exportFullOrgData()
    setDownloading(false)
    if (!result.success) {
      toast.error("Failed to generate export")
      return
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${orgName}-full-data-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Export downloaded")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DatabaseBackup className="h-4 w-4" /> Full Data Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">
          A complete, structured export of everything HOPE holds for your HOA - units, members, budgets,
          assessments, reserve fund history, contracts, tickets, meetings, documents, and key contacts. Your
          data is never locked into HOPE - you can download a full copy at any time.
        </p>
        <p className="text-xs text-gray-400">
          Downloads as a single JSON file. Login credentials and invite links are never included.
        </p>
        <Button onClick={handleDownload} disabled={downloading} className="gap-1.5">
          <Download className="h-4 w-4" /> {downloading ? "Preparing..." : "Download Full Data Export"}
        </Button>
      </CardContent>
    </Card>
  )
}
