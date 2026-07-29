"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { addUnit } from "@/app/actions/org"

export function NewUnitDialog() {
  const [open, setOpen] = useState(false)

  async function handleSubmit(formData: FormData) {
    await addUnit(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" /> Add Unit
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Unit</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Unit Number *</Label>
              <Input name="number" placeholder="1A" required />
            </div>
            <div className="space-y-1">
              <Label>Building</Label>
              <Input name="building" placeholder="Building A" />
            </div>
            <div className="space-y-1">
              <Label>Bedrooms</Label>
              <Input name="bedrooms" type="number" min="0" placeholder="2" />
            </div>
            <div className="space-y-1">
              <Label>Bathrooms</Label>
              <Input name="bathrooms" type="number" step="0.5" min="0" placeholder="1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Address Line 1</Label>
              <Input name="addressLine1" />
            </div>
            <div className="space-y-1">
              <Label>Address Line 2</Label>
              <Input name="addressLine2" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>City</Label>
              <Input name="city" />
            </div>
            <div className="space-y-1">
              <Label>State / Province</Label>
              <Input name="state" />
            </div>
            <div className="space-y-1">
              <Label>Postal Code</Label>
              <Input name="postalCode" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input name="country" />
          </div>
          <div className="space-y-1">
            <Label>Civic Roll Number</Label>
            <Input name="civicRoll" placeholder="Municipal assessment/civic roll number" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Unit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
