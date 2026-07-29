export function rangesOverlap(
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date | string,
  bEnd: Date | string
) {
  return new Date(aStart) <= new Date(bEnd) && new Date(bStart) <= new Date(aEnd)
}

// Parses a "YYYY-MM-DD" <input type="date"> value as a local-midnight Date.
// `new Date("YYYY-MM-DD")` parses as UTC, which drifts a day off the date
// the user picked once displayed in a timezone behind UTC.
export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}
