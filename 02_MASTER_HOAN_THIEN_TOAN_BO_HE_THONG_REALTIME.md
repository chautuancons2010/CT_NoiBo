# CHÂU TUẤN ENTERPRISE SYSTEM
# MASTER PROMPT 02 — COMPLETE BUSINESS SYSTEM, REALTIME & PRODUCTION HARDENING

> Use this prompt after MASTER PROMPT 01 has completed or the repository already has an equivalent stable foundation.
> This file REPLACES the earlier module-by-module prompts. Do not also send the older Prompt 02.
> This is a single consolidated execution prompt. Continue through all stages without asking for another routine prompt.

## 1. ROLE, LANGUAGE, AND FINAL OBJECTIVE

You are the lead software architect, senior full-stack engineer, database engineer, QA engineer, and product-minded UI engineer responsible for completing the internal enterprise system for **Công ty Xây dựng Châu Tuấn**.

Communicate progress, blockers, verification results, and the final handoff in **Vietnamese**.

Complete, integrate, repair, and production-harden the remaining system in one coordinated program of work:

1. Human Resources
2. Shifts, schedules, work locations, and attendance policies
3. Online/offline attendance and monthly timesheets
4. Leave requests, approvals, and PDF export
5. Projects, construction sites, project updates, and worker roll call
6. Products, warehouses, inbound, outbound, transfer, stocktake, and inventory ledger
7. Partners, contracts, shipments, and import/export document tracking
8. Unified approvals, notifications, reports, and executive dashboards
9. System administration, users, roles, permissions, branding, and settings
10. System-wide Realtime synchronization
11. Responsive UI/UX and visual consistency across every route
12. Security, RLS, Storage policies, audit logs, data integrity, performance, testing, and deployment readiness

Do not stop at a plan, mock UI, placeholder page, or hardcoded demonstration data. After the initial audit, implement all safe work required to reach the Definition of Done.

Only pause if a genuinely blocking business decision, unavailable credential, destructive migration risk, or protected external action prevents safe progress. Otherwise choose conservative defaults, document them, and continue.

---

## 2. IMPORTANT REALITY ABOUT A SINGLE LARGE RUN

This prompt intentionally combines the remaining work to reduce repeated prompt overhead. However, correctness is more important than pretending everything can be finished in one uninterrupted context window.

Work sequentially using the stages in this file.

Maintain an authoritative checkpoint file:

`docs/MASTER_02_PROGRESS.md`

After each stage, update it with:

- status: not started / in progress / completed / blocked
- database migrations applied or created
- routes and components completed
- tests actually run and results
- remaining defects
- exact next safe action

If the execution session becomes constrained:

- finish the active atomic change
- leave migrations, imports, and build state consistent
- update the checkpoint
- do not start a risky partially completed stage
- report the exact continuation point

On continuation, read the checkpoint, Git diff, migrations, and tests. Never restart completed work merely because a new Codex session begins.

---

## 3. FIRST ACTION — AUDIT THE CURRENT REAL STATE

Before changing code, inspect:

- repository instructions
- Git status and existing user changes
- output and documentation from MASTER PROMPT 01
- framework, package manager, scripts, and directory structure
- current modules and routes
- Supabase clients and environment handling
- migrations, database types, functions, triggers, indexes, RLS, and Storage policies
- authentication, middleware, authorization, roles, and permission scopes
- shared query/mutation patterns
- Realtime channels and subscription cleanup
- offline/PWA/IndexedDB code
- existing HR, attendance, leave, project, warehouse, import/export, executive, and admin functionality
- app launcher, contextual sidebars, topbar, PageHeader, design tokens, shared components
- tables, forms, filters, dialogs, drawers, responsive behavior
- notifications, file uploads, PDF and Excel exports
- audit/error handling
- tests and build status

Run the existing safe validation commands before broad edits:

- typecheck
- lint
- tests
- production build where feasible

Record pre-existing failures before editing so they are not misrepresented as newly introduced defects.

Update `docs/MASTER_02_PROGRESS.md` with the baseline.

Do not spend the whole run auditing. Continue into implementation.

---

## 4. ABSOLUTE SAFETY RULES

Do not overwrite or discard unrelated user changes.

Do not use destructive Git commands.

Do not rewrite stable working features only because another implementation is familiar.

Do not change the framework or introduce an overlapping state/form/query library without clear necessity.

Do not expose Supabase service-role credentials to client code.

Do not commit secrets or `.env.local`.

Do not treat hidden UI actions as authorization. Protect routes, server commands, database rows, Realtime visibility, and Storage objects.

Do not allow the browser to directly set privileged final states such as:

- approved
- posted
- finalized
- cancelled after posting
- inventory balance
- attendance accepted

Do not mark a mutation successful before durable server confirmation, except where the UI explicitly and accurately says it is saved locally and awaiting synchronization.

Do not make Realtime the source of truth. PostgreSQL/Supabase persistent state is authoritative.

Do not directly edit inventory balances without an auditable, atomic ledger transaction.

Do not silently overwrite attendance history or approval history.

Do not add biometric or facial-recognition functionality.

Do not require Docker.

Keep deployment compatible with Vercel and Supabase.

Use forward-only, reviewable migrations and avoid destructive data loss.

---

## 5. SYSTEM-WIDE REALTIME — HARD REQUIREMENT

Realtime synchronization is mandatory for all data where a user benefits from seeing committed changes promptly.

Build or repair one shared Realtime architecture rather than page-specific subscriptions.

### Core Realtime principles

1. Database state is authoritative.
2. Only committed changes are propagated.
3. Every subscription is filtered to the authenticated company/workspace and permitted scope.
4. RLS applies to Realtime visibility.
5. Subscriptions are created once and cleaned up on unmount, scope change, workspace change, and logout.
6. Events are deduplicated by stable record/event/version identity.
7. An incomplete payload triggers targeted invalidation/refetch instead of unsafe local guessing.
8. Reconnect, tab resume, browser wake, and long disconnection trigger reconciliation with the database.
9. Missed events during suspension must not leave stale permanent state.
10. Realtime failures degrade gracefully; they do not prevent normal persisted CRUD.
11. Online/offline/connecting/reconnecting status is available centrally.
12. Do not subscribe to entire large tables without meaningful filters.
13. Mutations and Realtime events must not produce duplicate toast messages or duplicate list rows.
14. Unread notifications and approval counters reconcile against stored counts.

### Centralize

- channel naming
- scope/filter construction
- subscription lifecycle
- event schema/version
- cache/query invalidation mapping
- deduplication
- reconnect/backoff behavior
- observability/error reporting
- cleanup

### Apply Realtime to

- employee status and relevant master data
- schedules and work assignments
- attendance confirmation/rejection/review
- pending attendance synchronization result
- attendance corrections
- leave requests and approval decisions
- project/site assignments and project updates
- worker roll call
- warehouse document status
- posted inbound/outbound/transfer/stocktake results
- inventory availability/balance views after posting
- shipment, contract, and import/export status
- approval inbox
- notifications and unread counts
- executive operational dashboards
- system settings where live refresh is safe

### Do not use Realtime carelessly for

- every keystroke in forms
- draft local edits not yet saved
- huge unfiltered event feeds
- privileged information outside current permission scope
- replacing transactional database operations

Create/update `docs/REALTIME_MATRIX.md` containing:

- domain
- source table/event
- authorized audience
- filter/scope
- UI cache/query affected
- deduplication key
- reconnect reconciliation method
- expected fallback if Realtime is unavailable

Add lifecycle, deduplication, reconnect, stale-cache, and multi-tab tests where the current tooling permits.

---

## 6. SHARED DATA-INTEGRITY AND COMMAND ARCHITECTURE

Use server-validated commands or transaction-safe database functions for important state transitions.

Every retryable important mutation needs an operation ID/idempotency key, including at minimum:

- attendance submission
- attendance correction decision
- leave submission/decision
- warehouse document posting
- stock transfer posting
- stocktake adjustment posting
- approval decisions
- import/export workflow transitions where duplicate execution would cause harm

Use explicit state machines. Reject illegal transitions server-side.

Maintain audit records for sensitive operations with:

- actor
- company/workspace
- action
- module/resource
- record ID
- operation/request ID
- previous and resulting status or safe before/after data
- timestamp
- result
- contextual metadata

Never log secrets, access tokens, passwords, sensitive raw documents, or unnecessary personal data.

Use UTC storage timestamps and explicit Vietnam display/business-time handling. Test overnight shifts and month boundaries.

Regenerate database types after schema changes if the repository uses generated types.

---

## 7. AUTHENTICATION, PERMISSIONS, AND RLS

Preserve and extend the central permission catalog established in MASTER PROMPT 01.

Required scope types:

- self
- assigned project/site
- assigned warehouse
- managed team/department
- module-wide
- company-wide

Representative role templates:

- Employee
- Engineer / Site Staff
- HR Staff
- Project Manager
- Warehouse Staff
- Import–Export Staff
- Department Manager
- Executive
- System Administrator

Permissions remain independently assignable; roles are templates/groupings.

Protect:

- direct URLs
- server actions/API routes
- database rows
- Realtime subscriptions
- Storage buckets/object paths
- PDF/Excel/report generation
- approval actions
- administration settings

Test representative allow/deny cases, including cross-scope and cross-company denial where company scoping exists.

---

## 8. HUMAN RESOURCES

Implement or complete persisted workflows for:

- employee list, search, filter, pagination
- employee create/edit/detail
- activation/deactivation while preserving history
- employee codes unique within the company
- departments
- positions
- manager relationships
- employment dates/status
- default work location and attendance policy
- linked user account/invitation status where supported
- permission-controlled sensitive fields

Do not hard-delete employees referenced by attendance, leave, projects, warehouse, import/export, or audit history.

Use production-quality validation, error states, loading states, mobile layout, and permission-aware actions.

---

## 9. SHIFTS, SCHEDULES, LOCATIONS, AND ATTENDANCE POLICIES

Implement or complete:

- shift definitions
- office, flexible/site, and overnight shifts
- break rules
- grace periods
- employee schedule assignments with effective dates
- overlap validation
- office/project/site work locations
- latitude/longitude and allowed radius
- acceptable GPS accuracy threshold
- photo-required policy
- offline-allowed policy
- policy history/snapshot needed for later audit

Do not hardcode policy thresholds in pages.

---

## 10. RELIABLE ONLINE/OFFLINE ATTENDANCE

Prevent known historical failures:

- UI says success but record is missing
- duplicate records after retry/double tap
- server saved but response was lost
- stale UI after Realtime/cache mismatch
- wrong location or wrong distance unit
- queue lost after refresh
- photo uploaded separately and becomes orphaned
- timezone/overnight-shift miscalculation

### Attendance event model

Use append-oriented raw events with, where applicable:

- stable ID
- idempotency/operation ID
- authenticated employee
- check-in/check-out event type
- client captured time
- authoritative server received time
- business date and shift
- location/site/project
- latitude/longitude/accuracy
- computed distance
- policy snapshot/version
- photo reference/status
- online/offline/admin/import source
- accepted/rejected/needs-review status
- reason code
- created actor and audit metadata

Corrections never silently erase original events.

### Location

- use a tested Haversine implementation with explicit meter units
- validate coordinate range and reported accuracy
- compare accuracy threshold and allowed radius
- request a better reading or route to review/rejection when data is weak
- store the evidence needed for later review
- give useful Vietnamese guidance for weak indoor GPS
- do not continuously track workers after the operation

### Photo

- mobile-friendly capture
- safe type/size validation
- responsible compression
- protected Storage bucket/path
- authorized/signed access
- deterministic path based on operation ID
- retry support
- orphan cleanup strategy
- never public access

### Server command

Atomically:

- authenticate user
- resolve employee
- check permission and active assignment
- load applicable shift/location/policy
- validate transition/order
- compute/verify distance in trusted code
- enforce idempotency
- persist event/result
- write audit entry
- return a stable result for duplicate retry

Never trust client-provided accepted status, employee ID, distance, or policy outcome.

### Offline queue

Use IndexedDB or the established durable mechanism:

- generate operation ID before local save
- survive refresh/app restart
- explicit local saved / pending / syncing / confirmed / rejected / needs-review states
- bounded exponential retry plus manual retry
- controlled event ordering
- multi-tab duplicate-sync protection where practical
- session-expiry handling without deleting the queue
- server revalidation of possibly stale assignments and policies
- attachment retry
- reconnect/tab-resume reconciliation

Test:

1. offline check-in → refresh → reconnect → exactly one server record
2. server saved but response lost → retry → same result
3. double tap → one operation
4. multiple queued events → controlled order
5. expired session → queue retained
6. weak GPS
7. photo retry
8. assignment changed while offline

The UI must never describe a pending local operation as server-confirmed success.

---

## 11. ATTENDANCE HISTORY, CORRECTIONS, TIMESHEETS, AND EXCEL

Implement or complete:

- personal attendance history
- team/department/site view by permission
- event timeline
- daily derived status
- late/early/missing/review states
- attendance correction request and approval
- immutable original event plus traceable adjustment
- deterministic recalculation
- monthly timesheet
- finalize/lock workflow
- Excel export

Use one shared calculation source for the UI and Excel export.

Support normal shifts, overnight shifts, missing events, approved leave, corrections, office work, and site work.

Excel requirements:

- Vietnamese text and dates display correctly
- timezone explicit
- totals match UI calculations
- safe period/scope filename
- server-side permission check
- no drifting duplicated formulas
- fixture-based tests comparing displayed and exported values

Desktop may use a wide controlled table. Tablet uses internal table scrolling. Mobile uses summary/list and drill-down rather than shrinking 31 columns into unreadable text.

---

## 12. LEAVE, APPROVALS, AND PDF EXPORT

Implement or complete:

- leave types
- draft where product conventions support it
- create/save/submit
- full-day and partial-day requests
- overlap/date validation
- approval queue
- approve/reject with comment
- cancellation policy/state
- status history
- attachments
- notifications and Realtime updates
- approved leave integration into timesheets

Enforce transitions server-side. The client cannot directly write `approved`.

After a request is saved, provide **Xuất PDF** based on permission/status policy.

PDF requirements:

- professional A4 Vietnamese internal form
- company name and official logo
- correct embedded Vietnamese font
- employee code/name, department, position
- leave type and date/time range
- duration and reason
- handover/contact information if collected
- request date and status
- requester/approver information and suitable signature placeholders
- document/reference number if used
- stable request snapshot/version
- safe filename
- no clipped content
- correct page breaks for long content
- authorized generation/data access
- desktop/mobile download

If no company-approved legal template exists, use a conservative configurable internal form and do not claim it is legally mandated.

Render and visually inspect representative PDFs, including long Vietnamese text and approved/partial-day cases.

---

## 13. PROJECTS AND CONSTRUCTION SITES

Implement or complete:

- project list/create/edit/detail/status
- site/work-location configuration
- employee/member assignment with effective dates and roles
- project updates with text and protected attachments/photos
- daily worker roll call/site view
- project-manager permission scope
- recent updates and attention items
- Realtime project and assignment updates

Do not build a contradictory second attendance truth:

- personal attendance event is check-in/check-out evidence
- site roll call is a project/site operational view or explicit manager confirmation
- link/derive them according to documented rules
- do not duplicate records blindly

Avoid fake charts and decorative metrics.

---

## 14. WAREHOUSE MASTER DATA

Implement or complete:

- warehouses
- optional storage locations/bins where actually needed
- product categories
- units of measure
- products/SKUs
- product status
- unit conversions only where valid and necessary
- reorder/minimum threshold where used
- supplier/customer partner links
- opening balances through an auditable opening/adjustment document, not direct balance editing

Product and warehouse codes must have intentional uniqueness scopes.

Do not prematurely add lot/serial/expiry complexity unless existing business requirements or data already require it. If present, support it consistently across every movement.

Lists require server-backed search/filter/pagination for large data, permission-aware actions, responsive representation, and safe import validation if import exists.

---

## 15. WAREHOUSE DOCUMENT AND INVENTORY LEDGER

Use document headers, document lines, immutable posted stock movements, and derived/transactionally maintained balances.

Required document types:

- inbound receipt
- outbound issue
- warehouse transfer
- stocktake
- inventory adjustment generated from approved stocktake/difference

Suggested state machine, adapted to existing business rules:

```text
draft → submitted → approved → posted
      → cancelled before posting when allowed
submitted → rejected
posted → reversed through an explicit reversal document, never silently edited
```

### Atomic posting

Posting must be a transaction-safe server/database operation that:

- authenticates actor
- verifies warehouse scope and permission
- locks or safely coordinates affected balance rows
- validates document state and lines
- validates positive quantities and unit conversion
- enforces negative-stock policy
- prevents duplicate posting with idempotency/unique constraints
- creates immutable movement ledger entries
- updates or derives balances consistently
- changes document status exactly once
- creates audit records
- returns the stable result for duplicate retry

Never perform posting as independent client-side inserts/updates.

### Transfer

A transfer must atomically create matching outbound and inbound effects for source and destination. It must never complete only one side.

### Stocktake

- capture counted quantity separately from system quantity
- preserve snapshot time/version
- calculate difference
- require approval when policy requires
- post adjustment through ledger
- never overwrite balance directly

### Corrections

Posted documents are not edited silently. Use reversal/corrective documents with linkage and reason.

### Inventory queries

Provide:

- on-hand by product and warehouse
- movement history/card
- as-of history where practical
- low-stock alerts
- recent documents
- document detail and status timeline

Add concurrency tests for simultaneous outbound/posting and transfer.

Warehouse posting should require online server confirmation by default. Do not queue final inventory posting offline unless a separately proven conflict-safe design already exists. Offline draft capture may be considered, but must be clearly marked and validated on submission.

---

## 16. WAREHOUSE REALTIME

After a document is successfully committed/posted:

- relevant document lists update
- document detail/status updates
- affected inventory balance queries reconcile
- low-stock alerts update
- executive KPIs invalidate/refetch
- intended users receive notifications where useful

Deduplicate by document/movement/version identity.

Never update balances optimistically as final before posting succeeds.

If Realtime is missed, reconnect reconciliation must fetch the authoritative balance/document state.

---

## 17. PARTNERS, CONTRACTS, SHIPMENTS, AND IMPORT/EXPORT

Implement a focused operational import/export module, not full accounting.

### Partners

- supplier/customer/logistics/other types
- partner code and name
- contact and address fields as required
- tax/business identifiers where legitimately needed
- active/inactive state
- search/filter/pagination
- duplicate detection/validation
- relationship to warehouse and shipments/contracts

Do not put an always-open create form above an empty list if it harms usability. Use a PageHeader primary action and appropriate page/drawer/form pattern.

### Contracts

- contract/reference number
- partner
- type
- effective dates
- currency/value fields where needed
- status
- responsible employee
- protected attachments/documents
- notes and audit history
- links to related shipments/documents

Do not implement accounting recognition or tax calculation unless already in scope.

### Shipments/import-export cases

Support practical tracking fields where relevant:

- internal/reference number
- import/export direction
- partner
- linked contract
- transport mode
- origin/destination
- ETD/ETA and actual dates
- shipment/container/bill references where used
- responsible employee
- status
- milestones/checklist
- related documents and protected attachments
- notes/issues

Use a centrally enforced state machine, for example adapted to the business:

```text
draft → preparing → in_transit → arrived → completed
      → cancelled when allowed
```

Do not allow illegal backward transitions without an explicit correction workflow and audit reason.

### Integration boundaries

- a completed/received shipment may create or link to a warehouse inbound document
- it must not directly modify inventory balances
- warehouse posting remains the only stock-changing operation
- avoid duplicate partner/attachment records across modules

Provide Realtime updates for statuses, milestones, assignments, linked documents, and approval items.

---

## 18. UNIFIED APPROVALS AND NOTIFICATIONS

Implement or complete one permission-aware approval inbox covering:

- leave requests
- attendance corrections
- warehouse documents where approval is configured
- stocktakes/adjustments
- relevant import/export transitions or documents
- other existing configured approvals

Requirements:

- pending count
- filter by module/status/date/requester
- deep link to authorized record
- atomic approve/reject transition
- comment/reason
- concurrency protection
- status history
- audit log
- Realtime counter/list update
- no duplicate notifications on retry

Notifications require:

- intended recipient only
- safe concise Vietnamese message
- read/unread state
- deep link
- permission recheck at target
- deduplication key
- persisted source of truth
- Realtime delivery plus reconciliation

---

## 19. EXECUTIVE DASHBOARD AND REPORTS

Build useful operational views from real persisted data, not fabricated metrics.

Possible cards/sections, only when data exists and permission allows:

- employees active
- today’s attendance status and exceptions
- leave/correction approvals pending
- active projects and site attendance exceptions
- low-stock alerts
- recent/posting-pending warehouse documents
- active shipments and delayed milestones
- recent operational activity

Rules:

- queries must be scoped and performant
- Realtime should invalidate/reconcile affected metrics
- show last-updated/connection state where helpful
- empty state instead of meaningless chart
- no chart solely for decoration
- do not expose private employee details unnecessarily
- provide drill-down only to authorized destinations

Reports and exports must use shared domain calculations, enforce permissions server-side, handle Vietnamese text/timezone, and avoid freezing the UI for large datasets.

---

## 20. SYSTEM ADMINISTRATION AND BRANDING

Implement or complete a separate **Hệ thống / Quản trị** application for authorized users.

Include:

- users and account status
- roles
- granular permissions and scopes
- departments/positions/master data links
- module availability/readiness configuration
- company name/contact identity
- official logo upload/selection
- validated green/red brand tokens and limited safe theme options
- notification/template settings where applicable
- attendance settings
- warehouse settings, numbering, and negative-stock policy
- import/export settings/status catalogs where appropriate
- audit log viewer
- system health/configuration summary without secrets

Do not create a free-form arbitrary CSS editor.

Validate uploaded logos and preserve aspect ratio/transparency.

The Administration application is a product area; the administrator role is an authorization concept. Do not conflate them.

Setting changes that affect active screens should use safe Realtime refresh where appropriate. Critical policy changes must be audited.

---

## 21. FILES, STORAGE, PDF, AND EXCEL

Centralize attachment handling:

- safe MIME/type/size validation
- deterministic object paths
- company/workspace and record ownership metadata
- private buckets by default
- RLS/Storage policies
- signed or authorized download
- upload progress and retry
- orphan cleanup strategy
- audit where sensitive

Implement/verify:

- leave-request A4 PDF
- relevant saved-document PDF exports already required by the product
- attendance/timesheet Excel
- warehouse list/document/inventory exports where useful
- import/export tracking exports where useful

All exports must use authoritative server/domain results, correct Vietnamese fonts/text, explicit timezone, safe filenames, and server-side permission checks.

Render and visually inspect representative PDFs. Validate representative Excel values against UI/domain calculations.

---

## 22. UI/UX SYSTEM-WIDE REPAIR AND RESPONSIVE PASS

After business correctness and shared foundations are stable, perform a complete UI/UX consistency and responsive pass across every major route.

### Navigation architecture

Maintain:

```text
LOGIN
  → APPLICATION LAUNCHER
  → SELECT APPLICATION
  → MODULE DASHBOARD
  → CONTEXTUAL MODULE SIDEBAR
```

- no duplicate “Ứng dụng của tôi” inside module dashboards
- no endless all-module sidebar
- app switcher returns to launcher or switches module without logout
- only authorized modules/items appear

### Shell

- global topbar separate from PageHeader
- no collision between search, create action, icons, notifications, and profile
- page title below topbar
- contextual sidebar full/compact/mobile drawer states
- predictable z-index scale
- no content hidden behind fixed elements

### Shared components

Standardize and reuse:

- Button/IconButton
- Input/Textarea/Select/Date controls
- Badge/StatusBadge
- Tooltip/Dropdown/Popover
- Dialog/Drawer/Sheet
- Breadcrumb/PageHeader/Tabs
- DataTable/TableToolbar/Pagination
- FilterBar/mobile filter sheet
- FormSection
- Empty/Error/PermissionDenied states
- Skeleton/loading states
- Connectivity/Realtime status
- ConfirmAction

### Tables

- server-backed search/filter/pagination where data may grow
- clear numeric alignment
- row actions menu
- sticky header/columns only where useful
- controlled internal scrolling on tablet
- mobile list/card/expandable representation when appropriate
- never shrink a 12- or 31-column table to tiny unreadable text

### Forms

- consistent labels, errors, helper text, focus state
- prevent double submission
- logical sections
- desktop 1–2 columns as appropriate
- mobile 1 column
- dialogs/drawers never exceed viewport without internal scroll
- sticky actions do not cover content

### Visual identity

- Châu Tuấn primary green `#19A94A`
- brand red `#DC2625`
- neutral enterprise surfaces
- Vietnamese typography rendered correctly
- consistent tokens for spacing, radii, shadows, type, z-index, and transitions
- one icon language
- avoid excessive gradients, glassmorphism, large shadows, and cards around everything
- do not clone MISA AMIS or the launcher reference

### Required responsive checks

- 320px
- 360 × 800
- 390 × 844
- 430 × 932
- 768 × 1024
- 1024 × 768
- 1366 × 768
- 1440 × 900
- 1536 × 864
- 1920 × 1080
- 2560 × 1440

Also check representative desktop routes at 80%, 100%, 125%, and 150% browser zoom when feasible.

No global horizontal page scroll caused by layout bugs. Component-level table scrolling is allowed when intentional.

Use long Vietnamese names, project names, partner names, product names, document numbers, and large quantities during QA.

---

## 23. REQUIRED STATES AND USER FEEDBACK

Every important workflow must handle:

- initial loading
- background refresh
- empty data
- filtered empty result
- validation error
- permission denied
- not found
- network failure
- server conflict
- Realtime disconnected/reconnecting
- offline cached state
- pending local attendance
- file upload failure/retry
- PDF/Excel generation failure
- mutation pending/success/failure

Do not show raw database or Supabase errors to normal users.

Use safe Vietnamese messages plus developer diagnostics/request IDs where appropriate.

Do not create duplicate toasts when the mutation response and Realtime event describe the same operation.

---

## 24. PERFORMANCE AND SCALE

Optimize for realistic internal growth without premature complexity.

- use database indexes intentionally
- server-side pagination/filtering for growing tables
- avoid N+1 queries
- avoid global Realtime subscriptions
- avoid full dataset fetch for dashboards
- lazy-load major application sections where architecture supports it
- use CSS for responsive behavior instead of continuous viewport JS
- prevent unnecessary rerenders and duplicate queries
- avoid huge unoptimized images
- cache only with clear invalidation/reconciliation
- measure and address obviously slow routes/queries

Do not introduce microservices. Keep a maintainable modular monolith suitable for a small team.

---

## 25. TESTING PROGRAM

Use existing tooling and add only justified test support.

### Unit tests

- permission and scope helpers
- state machines
- idempotency/deduplication
- Haversine distance and units
- timezone/business date
- overnight shift
- attendance/timesheet calculations
- leave duration
- inventory quantity/unit calculations
- negative-stock validation
- transfer double entry
- import/export transition validation
- export mapping

### Database/integration tests

- representative RLS allow/deny and cross-scope denial
- duplicate attendance returns one result
- illegal approval transitions rejected
- concurrent approval safe
- correction preserves original attendance
- leave affects timesheet once approved
- warehouse posting is atomic and idempotent
- concurrent outbound cannot oversell when forbidden
- transfer cannot post one side only
- posted document cannot be silently edited
- stocktake adjustment is auditable
- shipment-to-inbound link does not directly change stock
- unauthorized Storage/PDF/Excel access rejected

### Offline/Realtime tests

- offline attendance survives refresh and syncs once
- lost response retry
- expired session retains queue
- photo retry
- duplicate/missed Realtime event handling
- subscription cleanup
- reconnect and tab-resume reconciliation
- multi-tab behavior where practical

### UI/end-to-end workflows

- login → launcher → authorized module
- employee lifecycle
- shift/location/policy assignment
- online attendance
- offline attendance sync
- attendance correction
- monthly timesheet and Excel
- leave request/approval/PDF
- project/site/assignment/update/roll call
- warehouse inbound/outbound/transfer/stocktake posting
- product inventory history
- partner/contract/shipment lifecycle
- approval inbox
- executive drill-down
- user/role/branding administration

### Visual QA

Inspect representative routes in every module on desktop, tablet, and mobile.

Render PDFs and inspect them visually.

Do not claim completion for a scenario not actually exercised against persisted data.

---

## 26. MIGRATION, SEED, AND EXISTING-DATA SAFETY

Before any schema change:

- inspect existing migration order
- identify existing production-like data assumptions
- avoid destructive changes
- prefer add/backfill/validate/transition patterns
- document risky changes and rollback guidance

If development seed data exists, include representative roles and edge cases but keep it clearly separate from production.

Do not use seed/demo data as runtime fallback.

Do not automatically apply destructive remote database changes without explicit authority. Creating safe migration files and local validation is allowed; report any required manual remote step exactly.

---

## 27. DEPLOYMENT READINESS

Prepare for Vercel + Supabase without requiring a custom domain or Docker.

Verify:

- production build
- required environment variable names in `.env.example`
- no secret in browser bundle/repository
- Supabase URL/key separation
- redirect/auth callback configuration documented
- Realtime publication/policy requirements documented
- Storage buckets/policies documented or migrated safely
- database migrations ordered
- scheduled/background needs documented honestly
- Vercel function/runtime limitations considered for PDF/Excel and large tasks
- error handling for unavailable external services

Create/update:

`docs/DEPLOYMENT_CHECKLIST.md`

Do not claim deployment completed unless it was actually performed and verified.

---

## 28. EXECUTION ORDER FOR THIS CONSOLIDATED PROMPT

Proceed through these stages without requiring another routine prompt:

### Stage 0 — Audit and checkpoint

- inspect real state
- baseline validation
- initialize/update `docs/MASTER_02_PROGRESS.md`

### Stage 1 — Cross-cutting correctness

- schema conventions
- command/state-machine/idempotency foundation
- permissions/RLS/Storage
- audit/error handling
- system-wide Realtime architecture

### Stage 2 — HR and attendance

- employees/organization
- locations/policies/shifts/schedules
- online/offline attendance
- history/corrections/timesheets/Excel

### Stage 3 — Leave and projects

- leave/approval/PDF
- projects/sites/assignments/updates/roll call

### Stage 4 — Warehouse

- master data
- documents
- atomic posting
- ledger/balances
- inbound/outbound/transfer/stocktake
- warehouse Realtime and exports

### Stage 5 — Import/export

- partners
- contracts
- shipments/milestones/documents
- warehouse integration boundary
- Realtime

### Stage 6 — Shared operations

- approval inbox
- notifications
- reports
- executive dashboard
- administration/branding/settings

### Stage 7 — System-wide UI/UX repair

- shell/navigation
- shared components
- every major route
- responsive/mobile/tablet
- loading/empty/error/offline states

### Stage 8 — Full verification

- tests
- typecheck/lint/build
- database/RLS/concurrency
- Realtime/reconnect
- offline
- PDF/Excel
- visual QA
- performance review
- deployment checklist
- Git diff and documentation review

After every stage, update the checkpoint and keep the repository buildable.

---

## 29. DEFINITION OF DONE

This consolidated phase is complete only when all applicable items are true:

### Foundation and Realtime

- [ ] Database remains authoritative.
- [ ] Important commands are server-validated, transactional where needed, and idempotent.
- [ ] RLS and direct-route/server authorization cover representative scopes.
- [ ] Storage access is private and authorized.
- [ ] Realtime matrix and shared lifecycle architecture exist.
- [ ] Relevant modules update promptly after committed changes.
- [ ] Realtime events are scoped, deduplicated, and cleaned up.
- [ ] Reconnect/tab-resume reconciliation prevents permanent stale state.

### HR, attendance, and leave

- [ ] Employee and organization workflows use persisted data.
- [ ] Shifts, schedules, locations, and policies are configurable.
- [ ] Attendance is idempotent and server-confirmed.
- [ ] Offline attendance survives refresh and syncs exactly once.
- [ ] GPS accuracy/radius and protected photos are handled.
- [ ] Original attendance history remains auditable.
- [ ] Corrections use approval workflow.
- [ ] Timesheet and Excel share one calculation source.
- [ ] Leave approval integrates with timesheet.
- [ ] Saved leave request exports a visually verified Vietnamese A4 PDF.

### Projects

- [ ] Projects/sites/assignments/updates use persisted data.
- [ ] Worker roll call and attendance do not conflict as two truths.
- [ ] Project access respects assignments/management scope.

### Warehouse

- [ ] Product/warehouse master data works.
- [ ] Inbound/outbound/transfer/stocktake workflows work.
- [ ] Posting is atomic, idempotent, and audited.
- [ ] Posted documents cannot be silently edited.
- [ ] Transfers cannot complete one side only.
- [ ] Inventory balances agree with the ledger.
- [ ] Realtime balance/document views reconcile after commits.

### Import/export

- [ ] Partners, contracts, shipments, milestones, and documents work.
- [ ] State transitions are enforced and audited.
- [ ] Shipment integration never changes stock outside warehouse posting.

### Shared product quality

- [ ] Unified approvals and notifications work without duplicates.
- [ ] Executive dashboard uses real scoped data.
- [ ] Administration manages users/roles/branding/settings safely.
- [ ] Major routes have loading/empty/error/permission/offline states.
- [ ] Desktop, tablet, and mobile are usable.
- [ ] No global horizontal overflow on representative routes.
- [ ] PDF and Excel outputs are verified.
- [ ] Typecheck/lint/tests/build results are recorded exactly.
- [ ] Deployment checklist exists.
- [ ] Existing user changes and unrelated working behavior were preserved.

Do not mark a checkbox completed without evidence.

---

## 30. OUT OF SCOPE UNLESS ALREADY PRESENT

Do not expand into unrelated large products:

- full payroll/tax/accounting engine
- facial recognition or biometric matching
- continuous employee tracking
- customer CRM/marketing automation
- public e-commerce
- advanced customs declaration integration
- native iOS/Android application
- microservices architecture
- arbitrary CSS/code editor in Administration

Create clean future integration boundaries only.

---

## 31. FINAL HANDOFF REPORT

At the end, report in Vietnamese with evidence:

1. Initial repository condition and baseline failures
2. Architecture and database decisions
3. Migrations, RLS, Storage policies, and generated types
4. System-wide Realtime implementation and tested reconnect behavior
5. HR, schedules, attendance, offline sync, corrections, timesheet, and Excel
6. Leave workflow and visually verified PDF
7. Projects/sites/assignments/updates/roll call
8. Warehouse documents, posting, ledger, balances, concurrency, and Realtime
9. Partners/contracts/shipments/import-export and warehouse boundary
10. Approvals, notifications, reports, executive dashboard
11. Administration, users, roles, branding, and settings
12. UI architecture, responsive behavior, and routes/viewports actually inspected
13. Exact typecheck/lint/test/build results
14. Performance and security checks
15. Deployment requirements and manual Supabase/Vercel steps
16. Remaining defects, risks, or explicitly deferred features
17. Exact checkpoint/next action if anything remains incomplete

Do not claim “Realtime toàn hệ thống,” “offline hoàn chỉnh,” “kho chính xác,” “responsive hoàn chỉnh,” or “production-ready” unless the relevant scenarios were actually implemented and verified.

Do not ask me to send another prompt for routine work described here. Continue from `docs/MASTER_02_PROGRESS.md` until the Definition of Done is satisfied or a real blocker requires owner input.
