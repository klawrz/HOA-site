// Shared by every role's "As X..." home-page block (Owner first, Property
// Manager next) - time-of-day greeting text, nothing role-specific.
export function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}
