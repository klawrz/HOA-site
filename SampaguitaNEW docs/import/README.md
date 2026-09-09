# SampaguitaNEW — import data for the live sandbox

Structured, near-real Sampaguita data to load when the live sandbox is stood up,
so the figures don't have to be re-typed. Source documents live one level up in
`SampaguitaNEW docs/`.

## Rebuilding the data — the fast path

- **`prisma/seed-sampaguita.ts`** (run `npm run db:seed:sampaguita`) re-applies the
  whole financial + roster layer — org currency/rate, reserve target/policy/figures
  and history, the FY2027 budget with all 34 line items, the 14 villa dues
  allocations, and the employee roster — onto an existing `SampaguitaNEW` org.
  Idempotent; safe to run repeatedly.
- It does **not** recreate the org / units / users / ownerships. Those come from
  the `dev.db` committed in git (state at every commit) or the `dev.db.backup-*`
  snapshots. Restore one of those first, then run the seed if needed.
- The files below are the human-readable copy of the same data and the route for
  loading it through the app UI.

## Files

| File | What it is | How to load |
|---|---|---|
| `fy2027-operating-budget.csv` | The proposed FY2027 operating budget — 34 line items, grouped by category, with prior-year actuals. 1 USD = 17.5 MXN. Total 4,642,223 MXN (~$265,270). | Create a DRAFT operating budget for the period, then **Finances → the budget → Import CSV**. Columns: `#, Category, Line Item, Budgeted, Prior Year Actual` (the `#` and `TOTAL` rows are ignored by the importer). |
| `financial-position-2026-Q1.md` | Banking cash position, wires in transit, reserve-fund status, the 2025/Q1 utility variances, payroll gaps, and other known shortfalls — from the Treasurer's Q1 emails. | Reference for the Reserve Fund page and the quarterly owner update; not a budget import. |

## Notes

- The budget CSV reflects the cleaned state of the Fiscal 2027 draft after the
  category tidy-up (waste/recycle under Utilities, bank commission under
  Administration, `Property taxes` and `Beach concession` split into their own
  funded lines).
- `financial-position-2026-Q1.md` ends with a checklist of budget lines that are
  still missing or undersized versus what the Treasurer describes.
- Regenerate the CSV from a budget by exporting it (**Export CSV** on the budget
  page) — the column layout round-trips through the importer.
