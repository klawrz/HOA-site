import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Clear date + time stamp for things like ticket submissions, where knowing
// exactly when (not just which day) matters.
export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

// Date-only display for date-range data (e.g. occupancy calendars) where
// time-of-day isn't meaningful.
export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { dateStyle: "medium" })
}

// ISO 8601 (YYYY-MM-DD) - unambiguous across locales, unlike MM/DD/YYYY.
// Reads the Date object's local components directly rather than
// toISOString() (which converts to UTC and can drift a day off a
// local-midnight Date in timezones behind UTC).
export function formatDateISO(date: Date | string) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
