// No email provider is wired up yet - sending real mail is part of the
// deployment/infrastructure layer, not this module. Until that's in place,
// the reset link is written to the server log so the flow is still fully
// testable end-to-end. Swap the body of this function for a real provider
// call (Resend, SES, etc.) without touching any caller.
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  console.log(`[password reset] ${email} -> ${resetUrl}`)
}
