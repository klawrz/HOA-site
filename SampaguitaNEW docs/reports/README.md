# SampaguitaNEW — reports

Generated owner-facing documents. The HTML files here are the source of record;
each is also published as a private Claude artifact (link below) for sharing.

| File | What it is | Artifact |
|---|---|---|
| `annual-report-2026.html` | Property Annual Report for the November 7, 2026 AGM — governance, statutory-filing register, the villas, FY2027 budget (with full line-item appendix), dues, reserve fund, roof special assessments, employees, AGM decisions, and appendices (full budget breakout, previous-AGM-minutes template, AGM call / agenda / proxies / quorum). | https://claude.ai/code/artifact/71d2b46a-f7df-476a-b2a7-baf830132e62 |
| `annual-report-2026-hope-revB-2026-09-10.html` | **HOPE-generated demonstration edition, Rev B (2026-09-10)** — supersedes Rev A. Incorporates Greg's (ex-oficio Board) review: **AGM → Fri Nov 6, 2026**; **exchange rate → 17** (all USD figures recomputed; FY2027 budget now ~USD 273,072); **reserve → USD 37,313** (Sept 2026, 37% of target, above floor); **Bufete Troncoso** recorded as current legal representative; **no** accountant/lawyer change — instead new AGM motions **G** (appoint Legal Rep 2027) and **H** (appoint Accountant 2027). New **§2 "The year in brief — the PM's clean-up"** (utilities catch-up, beach concession, payroll/IMSS, filing register — builds owner confidence in the new PM). New **§4 "2026 year to date"** = "awaiting figures" placeholder table (actuals coming shortly). **Roof** reframed per Greg: only 3 villas reported problems, no property-wide inspection; Decision **C** is a motion to assess scope + approve action + fund by assessment, with **current tickets accepted as sufficient basis**; per-villa roof figures marked provisional. Budget kept as proposed with a prominent **"review for savings, target ~USD 250,000"** callout. **§6** gains a **Capital requirements — five-year reserve schedule** table (items > USD 3,000, for the audit reserve study). **§7 Banking** rebuilt as a **current-balances table** (account / currency / balance / as-of date / note) incl. **Scotiabank Canada USD 46,597** + funds-on-hand USD 83,910, framed as Board/signing-authority updatable. PDF: `C:\Users\dara\Sampaguita-Annual-Report-RevB-2026-09-10.pdf` (20 pp). | — (local file) |
| `annual-report-2026-hope-revA-2026-09-09.html` | **HOPE-generated demonstration edition, Rev A (2026-09-09).** Short (~14pp) owner-handout re-cut: cover carries a "significant financial concern" banner + a compact uncertified/confidential notice; **§1 The financial situation** leads (glance band, five financial alerts, "material additional cost" callout, non-financial items); §2 FY2027 budget; §3 dues & assessments by villa; §4 reserve fund; §5 the Association at a glance (governance / PM / villas / employees / insurance / filings, condensed); §6 AGM decisions; §7 basis of report + one short "about this edition" note (the only HOPE-selling content); Appendix A full budget breakout. Every section footer and the print running-footer state the data is unconfirmed and carry discreet **ADEUX · HOPE** branding. Print stylesheet tuned for an owner handout (cover on its own page, appendix `break-before`, light palette forced for dark-mode machines, fixed running footer). Same figures as `annual-report-2026.html` at 1 USD = 17.5 MXN. | — (local file; publish privately if shared) |

Per-owner report: `villa-1-owner-report-revA-2026-09-10.html` (+ PDF `C:\Users\dara\Villa-1-Owner-Report-RevA-2026-09-10.pdf`, 9 pp) — everything on file for Villa 1 from `dev.db`: unit profile, ownership register (incl. the 2026-09-09 test rows + placeholder start date, flagged), management/contacts/access (all "none on file"), dues **estimate** (7.89% × proposed FY2027 USD 265,270 = USD 20,930/yr; no dues assessment issued so no invoice/dates/payments), the 2027 roof assessment (USD 5,357, draft, due 2027-06-01), other charges (none), the open urgent "bad water leak in roof" ticket (unassigned, est. 20,000 currency-unrecorded), and a 2027 obligations summary (~USD 26,287). USD-primary, same house style + ADEUX·HOPE unconfirmed footers, Rev A · 2026-09-10.

Companion policy document (kept as markdown at `../reserve-fund-policy.md`):
https://claude.ai/code/artifact/95c943c5-e8e5-4161-b15e-ebd7be318d4f

## Notes

- All figures are as of 2026-09-09 at 1 USD = 17.5 MXN.
- `annual-report-2026-hope-revA-2026-09-09.html` is **USD-primary** (peso equivalents secondary),
  pulls current data from `dev.db` (SampaguitaNEW org: ownership incl. Villa 1 now solely Andrea
  OhUiginn Cummings, both ex-oficio board seats incl. Greg Smith, bank signing authority Greg Smith,
  reserve balance USD 30,000 / 30% / at floor). Year-over-year is **budget-to-budget** (FY2027 USD
  265,270 vs FY2026 ~USD 205,000 ≈ +29%) — the earlier +82% compared FY2027 budget to 2025 recorded
  actuals (~USD 146k) and overstated it. FY2026 budget figure is from the Treasurer and unconfirmed.
  Regenerate the dump anytime with a throwaway tsx script against `src/lib/db` (needs
  `import "dotenv/config"`).
- The FY2027 budget is a **proposed** budget (not adopted); the reserve fund
  policy is **Revision 2, a circulation draft**; the 2027 roof assessment is a
  **draft**. All are subject to owner motion at the AGM.
- The statutory-filing register (report §3) and the AGM mechanics (Appendix C)
  are **indicative** — due dates, thresholds and notice periods must be confirmed
  with the HOA's accountant and against the 2013 Bylaws / Condominium Regime.
- No directly-contracted accountant is identified in the HOA records; no prior
  AGM minutes are on file. Both are flagged in the report as gaps to close.
- To regenerate: the report is hand-built HTML; the underlying figures come from
  `dev.db` (restore via `npm run db:seed:sampaguita` if needed).
