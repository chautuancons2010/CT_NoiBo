# Attendance release · 2026-11-11

## Scope

Attendance, HR and the package worker-timesheet viewer remain available. Other applications show a small lock and reject direct API writes. Existing permissions still apply inside every enabled module. Account management is available at `/settings/users`, with an entry on the employee list for account creators. Create an employee first, then create their account and assign roles.

Production is a separate fresh build against `uioywupuuestcaliawlc`. TEST remains on `lgmlkagcytfjazulgfbz`. Do not promote a TEST artifact, copy fixtures, seed production or transfer TEST accounts/photos. Production starts with the existing admin identity and empty business tables.

## Behavior

- Stable mobile toolbar and role navigation; Apps appears in the bottom navigation.
- Worker names in packages open a monthly calendar, including days without records. Evidence stays read-only.
- HR reviews field attendance by day and package, and can move from a supervisor's personal record to their worker rounds that day.
- Day filters remain visible in timesheets; period export uses the unified attendance workbook.
- Shift assignment uses database-backed package selection, effective dates and weekdays. Ended assignments retain history. Policy no longer edits shift start/end/name; shift catalog controls them.
- Multiple personal in/out pairs and worker rounds are supported. Retry IDs remain idempotent. Offline worker sessions preserve original capture time and validate personal attendance at that time.
- JPEGs include original Vietnam time, GPS/address and accuracy. Maximum long edge is 1920, with adaptive compression below the private bucket's 2 MB limit.
- IndexedDB commits photos before acknowledging local success. Reconnection retries across attendance pages. Address enrichment redraws from the retained original image, preserving capture time.
- Offline navigation caches only attendance-related pages and selected reads, scoped to the signed-in account. Authentication, writes and signed photo URLs are never cached. Login/logout clear private page caches. Browser storage must be available; a first visit needs connectivity.
- Missing GPS is labeled for verification; coordinates and addresses are never invented. Device/browser GPS accuracy remains a physical limitation.
- Personal payslips show “Chưa có thông tin” and “Vui lòng quay lại sau.” during this rollout.

## Data and verification

Read-only audit found no orphan attendance events or project assignments. Existing TEST photo rows had both original and thumbnail Storage objects in private buckets; historical E2E rows without actual photos remain unchanged and are labeled accurately. Realtime uses the `realtime_invalidations` publication and domain triggers, not publication of raw attendance tables.

Apply migrations `202611110001`–`202611110003` to each environment independently. Migration 003 corrects the enum type in sequence comparison. Production retention uses its own Vault secret and its own endpoint; activate the 45-day daily job only after the production endpoint is verified.

Browser evidence and safe reports: `test-results/attendance-hardening-20261111/`. Local browser QA exercised 320/390/430 px layouts, worker calendar, day/package filters, shift package picker, module locks, a real camera flow with simulated video/GPS, offline reload and subsequent actual TEST upload with HR reconciliation. No production business data was created by QA.
