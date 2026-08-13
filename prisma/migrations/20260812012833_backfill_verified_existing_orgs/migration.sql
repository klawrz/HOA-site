-- Grandfather every organization that existed before the verification
-- concept was introduced: none of them went through the new provisional ->
-- verified flow, and none should have their existing capabilities
-- (assessments, announcements, CSV owner import) silently revoked just
-- because this migration landed. Only organizations created going forward
-- start PROVISIONAL.
UPDATE "Organization"
SET "verificationStatus" = 'VERIFIED',
    "verifiedAt" = CURRENT_TIMESTAMP,
    "verifiedByName" = 'System backfill (pre-existing organization)'
WHERE "verificationStatus" = 'PROVISIONAL';
