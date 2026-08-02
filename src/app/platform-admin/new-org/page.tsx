import { NewOrgForm } from "./new-org-form"

export default function NewOrgPage() {
  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New organization</h1>
        <p className="text-gray-500 mt-1">
          Creates the org and sends an Account Owner invite to the email below. If that email
          already has a HOPE account, accepting simply adds this org to it.
        </p>
      </div>
      <NewOrgForm />
    </div>
  )
}
