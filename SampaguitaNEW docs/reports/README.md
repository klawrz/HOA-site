# SampaguitaNEW — reports

Generated owner-facing documents. The HTML files here are the source of record;
each is also published as a private Claude artifact (link below) for sharing.

| File | What it is | Artifact |
|---|---|---|
| `annual-report-2026.html` | Property Annual Report for the November 7, 2026 AGM — governance, statutory-filing register, the villas, FY2027 budget (with full line-item appendix), dues, reserve fund, roof special assessments, employees, AGM decisions, and appendices (full budget breakout, previous-AGM-minutes template, AGM call / agenda / proxies / quorum). | https://claude.ai/code/artifact/71d2b46a-f7df-476a-b2a7-baf830132e62 |

Companion policy document (kept as markdown at `../reserve-fund-policy.md`):
https://claude.ai/code/artifact/95c943c5-e8e5-4161-b15e-ebd7be318d4f

## Notes

- All figures are as of 2026-09-09 at 1 USD = 17.5 MXN.
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
