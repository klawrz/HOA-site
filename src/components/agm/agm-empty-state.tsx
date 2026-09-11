import { AgmSetupDialog } from "./agm-setup-dialog"

// Shown on the Board / PM AGM console when no AGM exists for the org yet.
export function AgmEmptyState({
  canManage,
  defaultYear,
}: {
  canManage: boolean
  defaultYear: number
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Annual General Meeting</h1>
        <p className="text-gray-500 text-sm mt-1">
          One meeting, two legal tracks — the Condominium Regime assembly and the Civil Association
          assembly. Set it up once and the agendas, proxy tracking and quorum tally all run from
          here.
        </p>
      </div>
      {canManage ? (
        <div className="bg-white border rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-gray-600">No AGM has been set up yet.</p>
          <AgmSetupDialog defaultYear={defaultYear} />
        </div>
      ) : (
        <p className="text-sm text-gray-400">No AGM has been scheduled yet.</p>
      )}
    </div>
  )
}
