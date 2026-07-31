"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Mail, Phone, Pencil, Trash2 } from "lucide-react"
import { deleteKeyContact } from "@/app/actions/key-info"
import { keyContactCategoryLabel, keyContactCategoryColor } from "@/lib/key-contact-styles"
import { KeyContactDialog } from "./key-contact-dialog"
import { KeyContactCategory } from "@/generated/prisma"

interface ContactRow {
  id: string
  category: KeyContactCategory
  name: string
  role: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

function ContactRowView({ contact, canManage }: { contact: ContactRow; canManage: boolean }) {
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    const result = await deleteKeyContact(contact.id)
    setRemoving(false)
    if (!result.success) toast.error("Failed to remove contact")
  }

  return (
    <div className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{contact.name}</p>
        {contact.role && <p className="text-xs text-gray-500">{contact.role}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-0.5">
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {contact.phone}
            </span>
          )}
          {contact.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> {contact.email}
            </span>
          )}
        </div>
        {contact.notes && <p className="text-xs text-gray-400 mt-1">{contact.notes}</p>}
      </div>
      {canManage && (
        <div className="flex items-center gap-2 shrink-0">
          <KeyContactDialog
            contact={contact}
            trigger={
              <button className="text-gray-400 hover:text-gray-700 transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            }
          />
          <button
            onClick={handleRemove}
            disabled={removing}
            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export function KeyContactList({ contacts, canManage }: { contacts: ContactRow[]; canManage: boolean }) {
  if (contacts.length === 0) {
    return <p className="text-sm text-gray-500">No contacts on file yet.</p>
  }

  const grouped = contacts.reduce<Record<string, ContactRow[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, rows]) => (
        <div key={category}>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${keyContactCategoryColor[category]}`}
          >
            {keyContactCategoryLabel[category]}
          </span>
          <div className="space-y-2 mt-2">
            {rows.map((c) => (
              <ContactRowView key={c.id} contact={c} canManage={canManage} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
