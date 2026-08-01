"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Eye, Home } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Icon components (forwardRef objects) can't be passed as props across the
// server/client boundary - resolve a string key to the actual component
// locally instead, entirely within this client file.
const icons = { eye: Eye, home: Home }

export function PolicyTextCard({
  icon,
  title,
  description,
  placeholder,
  value,
  canManage,
  action,
  successMessage,
}: {
  icon: keyof typeof icons
  title: string
  description: string
  placeholder: string
  value: string | null
  canManage: boolean
  action: (text: string) => Promise<{ success: boolean }>
  successMessage: string
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const Icon = icons[icon]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await action((form.get("text") as string) ?? "")
    setSaving(false)
    if (result.success) {
      toast.success(successMessage)
      setOpen(false)
    } else {
      toast.error("Failed to update")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4" /> {title}
          </CardTitle>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit</DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Textarea
                  key={value}
                  name="text"
                  placeholder={placeholder}
                  className="h-24 resize-none"
                  defaultValue={value ?? undefined}
                />
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {value ? (
          <p className="text-sm text-gray-600 whitespace-pre-line">{value}</p>
        ) : (
          <p className="text-sm text-gray-400">Not on file</p>
        )}
      </CardContent>
    </Card>
  )
}
