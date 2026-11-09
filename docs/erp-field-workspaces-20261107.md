# Field workspaces and navigation — 07/11/2026

Local CT_NoiBo refinement for the project-monitoring, worker-attendance and timesheet-period screens reported by the user. The accepted ivory/sage palette, login, stored records and authorization remain in use.

## Composition and ownership

- `AppRail` keeps a set of open contextual groups. Toggling one group leaves the others unchanged. Navigation opens the active group without resetting the other groups or the same-application navigation container.
- `ProjectMonitoringWorkspace` replaces duplicate charts with one searchable, sortable worklist, actual progress and a queue of real issues. Recent updates are an optional disclosure. Progress is not inferred from project health: an existing completed project with stored progress 98% continues to show 98%.
- `WorkerAttendanceWorkspace.module.css` owns task cards, roster, photos, confirmation and read-only session detail. Labels, dates, shift, workers and status use the existing API model. The initial page load does not create a session. A refresh retains available tasks. The history worklist has filters, local paging and a retry action.
- `routeRegistry` supplies attendance-step titles and previous-step return routes for both saved sessions and device drafts, without changing route authorization.
- `FieldTodayWorkspace.module.css` owns the project-today composition. Today's people and attendance action precede priority work, issues and material access. Contextual project tabs remain available on phones. The personal phone page presents field work first for users who already have worker-attendance creation permission.
- `TimesheetPeriodDetail` uses a single `RecordHeader`, shared workflow steps and filters, 15-row local paging, an export-options disclosure and explicit reconciliation. The stored July period has aggregate rows without daily rows; the warning and employee links remain visible. This UI change does not generate or repair financial/time records.

Shared controls, table, overlay, header, status, workflow and layout components remain the common primitives. Feature modules own business composition and use design tokens. No finishing stylesheet or new module/permission was added. `WorkspaceBody` no longer nests a second main landmark inside the application main landmark.

## Preserved behavior

Existing attendance creation, GPS checks, draft queues, photograph processing, submit, adjustment and end-of-day handlers remain connected. Timesheet recomputation, lock/unlock payloads and reconciliation guards are retained. Project, team, attendance and issue actions retain their permission checks. Long safety-checklist labels wrap on phones; status controls and step actions have touch targets of at least 44 px.

## Verification

The optimized webpack build and TypeScript check pass. The final full suite passes 1,144 tests in 191 test files; 37 tests in the existing configuration are skipped. The UI architecture audit passes across 200 pages and 560 UI files. Lint passes for the 17 changed TypeScript files. Targeted tests cover navigation independence, actual progress and links, permission-gated actions, history retry, attendance-step titles/return routes and the engineer's phone-page ordering.

Browser verification uses the locally authenticated existing administrator, read-only API requests and blocked business writes. Screens cover 320, 390, 768, 1440 and 1842 px where applicable. Interactions include independent navigation groups across routes, unaccented project search, health filtering, numeric progress sorting, whole-dataset timesheet search, paging, employee groups, reconciliation disclosure, export-options opening and worker-history retry.

A separate browser-only IndexedDB fixture verifies roster selection/search, retained approved leave, draft restoration after reload, local photo processing and the three attendance steps. It is never submitted or synchronized to hosted data. This fixture does not establish real-device camera, GPS accuracy or onsite offline/network reliability. The browser address lookup is stubbed as unavailable to avoid writing its server-side cache. Permissions specific to the engineer are verified by component fixtures; no account role is modified.

Private screenshots, authentication state and detailed run reports stay outside the application under the ignored Dtech `.tmp` directory. No GitHub push, Vercel deployment, database migration or password/account update is part of this local refinement.
