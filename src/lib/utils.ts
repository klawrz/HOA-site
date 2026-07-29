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
