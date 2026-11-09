# Châu Tuấn ERP — Master Design System

The 09/11/2026 correction concerns functional organization across the system. Apply the shared workspace composition in [the current system review](../../docs/system-workspace-review-20261109.md). Per-page visual cleanups and component-presence audits alone do not establish consistency or usefulness.

Revised 2026-11-05 after the user's correction. The authoritative implementation is [ERP UI contract](ERP.md), with live development references at `/design-system` and `/ui-preview/workspace`. See [the current ERP revision](../../docs/erp-interface-revision-20261105.md) for scope and evidence. Earlier UI review counts are historical and do not establish user acceptance.

## Direction

An operational ERP workspace informed by inspected MISA AMIS and Odoo screens: a warm white navigation area, soft sage active states and an ivory working canvas, white working surfaces, readable tables, grouped forms and deliberate information hierarchy. Keep the Châu Tuấn brand, configured identity and Inter. Data, status and actions determine the composition.

The established login screen is preserved: official large logo, original split layout and animated construction background. General requests to improve the internal interface do not authorize redesigning login. Its local palette and geometry are isolated from workspace tokens.

## System rules

- Tokens own shared values. `erp-components.css` owns current controls and surfaces; `ApplicationChrome.module.css` owns the shell; `WorkCalendar` owns calendar geometry. Seventeen historical stylesheets are isolated inside `@layer legacy`.
- Use complete Inter character sets at 400/500/600/700 and tabular figures. Page headings use 26px on desktop, 20px on phone. Controls use 10px radii, surfaces 16px, overlays 20px, with shared subtle surface elevation.
- Preserve current brand and status colors. Use one primary action per context; data and status take priority over decoration and repeated descriptions.
- Desktop navigation opens at 240px with names beside icons and a visible `Thu gọn` control. It collapses to an 80px icon rail with tooltips and can expand again; preserve explicit layout choices and permission filtering. The solid top bar is 64px high. Creation actions belong to the owning page header.
- Show one visible main title per working page at every viewport. No repeated greeting, eyebrow or descriptive subtitle beneath functions, actions, permissions or navigation.
- Lists use `DataTable` / `Worklist`. Desktop and tablet retain rows and columns, with internal horizontal scrolling. Phones use compact records, visible status and expandable secondary fields. Opening a side panel retains the desktop table.
- Search remains visible. More than two filter controls share a mounted `FilterSheet` on desktop as well as phone; Apply retains the original form and resets list pagination. Small filter sets stay inline.
- Custom selects support keyboard navigation, long-list search, disabled/empty/required states and native form data. Portal menus remain in the viewport above table clipping.
- Forms preserve fields, validation and workflow. Group primary and supplementary inputs through `FormWorkspace` where appropriate; keep a logical mobile reading order. Show labels, inline errors and clear primary/secondary actions; use sticky actions where appropriate.
- Dialogs trap and restore focus. Escape dismisses a nested dropdown before its parent. Phone dialogs retain safe areas and internal scrolling.
- Mobile exposes all authorized modules; viewport width is not a permission boundary. Preserve personal home, camera workflows and module-aware bottom navigation.
- Dashboard keeps the application bar visible above its title. Metrics, work queues and charts use real scoped data, with work before charts. Preserve permission filtering and pinned application order. Never invent series or KPIs to fill a reference image.
- The `admin` role is for administration, without personal attendance, leave or payslip actions. Management permissions and employee links remain intact. Account security is independent of HR records; the account menu always exposes password change.
- Motion respects reduced motion. Icon-only controls need accessible names; status needs visible text.

## Verification

Use the measurements and acceptance criteria in [ERP UI contract](ERP.md): toolbar 36px, form 40px, phone targets at least 44px. Preview routes remain unavailable in production. Static route coverage does not establish complete visual or business acceptance.

## Local refinement — 06/11/2026

The user requested a lighter system inspired by the Dtech landing page. Tokens remain the single owner of palette, material, density, radii and depth; shared component owners implement their geometry. Do not add a finishing stylesheet or per-page color overrides. The login scene and all business permissions/actions remain outside this visual redesign.

`GlobalLoadingIndicator` now uses a delayed, nonblocking top progress bar for page transitions only. Actions keep local feedback. `LoadingExperience.module.css` owns shared page/table/card placeholders and reduced motion. Navigation indicators do not change the width of links. Local preview and review are required; do not push GitHub, deploy, or modify hosted database schema without a new explicit request.

`FormWorkspace` owns the primary/secondary form composition; the employee create form retains all 28 named fields and uses its existing sticky actions. Connection degradation remains visible as periodic synchronization, with the detailed state available in the status title; it is never presented as a healthy live connection.

See [the local refinement verification](../../docs/erp-ui-refinement-20261106.md) for checks, data-loading behavior and remaining payroll infrastructure limits.

## Interaction refinement — 06/11/2026

The workspace palette has been accepted. Further refinement prioritizes the task sequence and information hierarchy. Document editors show required context, then editable lines, then supplementary allocation/delivery/notes. A transaction-required project stays visible in the primary context. `EditableLines`, `EditableLine` and `DocumentActions` in `Workbench.tsx` own this reusable composition; their geometry lives in `erp-components.css` and tokens. Keep decimal entry, stock checks, permissions, idempotency and save/post behavior intact.

Filter sheets show field labels. Applied criteria are distinct from draft controls and can be removed individually while retaining other criteria and resetting pagination. Employee search uses one search action beside the search field, with no duplicate tool menu. Filtered zero results must not imply that the underlying register is empty. See [workflow verification](../../docs/erp-ux-workflows-20261106.md).

Warehouse worklists share `WarehouseDocumentFilters` and `FilterTabs`. Search and advanced criteria commit together; URLs preserve applied state and pagination. Keep the warehouse reference hook mounted across query changes. One-click document opening and Back retain the list context. Review perceived speed with a compiled local build; development compilation is measured separately. Local run commands and evidence are in [local performance](../../docs/erp-local-performance-20261106.md).

## Record details — 06/11/2026

`RecordHeader` consolidates the record identity, real organization metadata, status, actions and `ContextTabs`; `RecordFields` owns read-only label/value rows. Shared geometry belongs to `erp-components.css` and dimensions to tokens. Tabs remain a single horizontally scrollable row. Employee salary composition belongs to `EmployeeSalaryPanel` and `EmployeeDetailWorkspace.module.css`: stored base salary first, components next, actual notes and a natural-height expandable timeline. Do not infer take-home pay or effective status from salary setup records. See [employee detail verification](../../docs/erp-employee-detail-refinement-20261106.md).

## HR workspaces — 06/11/2026

Use `SectionedForm`, `FieldGroup` and `FormActions` for grouped drawer forms. Shared geometry and `worklist-summary` belong to `erp-components.css`, drawer form width to tokens. Keep read and write errors distinct, preserve entered values, and wire `DataTable.onRetry` to the owning client request. A filtered register with no matches is distinct from an empty register. Missing optional infrastructure must be explicit; do not manufacture financial records or invite users into forms that cannot save. See [HR workflow verification](../../docs/erp-hr-workflows-20261106.md).

## System-wide workspace pass — 07/11/2026

`SectionedForm` owns overlay form geometry; `InlineForm` owns in-page forms; `FormFields` owns the responsive field grid. Preserve refs, native validation, disabled fieldsets and submit handlers when adopting them. Actions remain outside the field grid. Shared layout is in `erp-components.css`, with tokens for dimensions; feature modules retain business composition. Keep special quantity/allocation workbenches distinct. Long record identities wrap within the shared width token, without changing stored text. Tables load with column-aware skeletons. See [system-wide UI verification](../../docs/erp-ui-system-redesign-20261107.md) for the complete scope and test limits.

## Compact contextual navigation — 07/11/2026

Keep the sidebar focused on the current application. Group longer HR, warehouse and trade menus in the shared registry; let groups open and close independently, with the current route's group opened on navigation without closing other groups. A single authorized destination stays a direct link. In the compact rail, group icons open keyboard-accessible menus. Cross-application switching belongs to the existing header switcher; do not repeat all applications below the contextual menu. `ApplicationChrome.module.css` and sidebar tokens own density and indentation. See [navigation verification](../../docs/erp-navigation-refinement-20261107.md).

## Tables and operational usability — 07/11/2026

Ordinary worklists open a record in one click and expose a visible keyboard-accessible detail link; explicit selection workbenches keep selection behavior. Do not highlight an inert row. `DataTable.sortValue` sorts original values, with numeric comparison for amounts; optional local paging sorts the complete supplied dataset before slicing and resets with criteria. Server-paged lists retain their owning pager. Shared table density, focus and action geometry belong to ERP components and tokens. Dashboard work identifies real requesters/references/periods and orders pending work consistently on server and client. Chart links must apply real criteria; count axes use whole units. See [the usability review](../../docs/erp-tables-usability-review-20261107.md).

## Field operations and monitoring — 07/11/2026

Project monitoring uses one searchable/sortable worklist with stored progress, real issue links and optional recent updates. Timesheet periods use one record identity, 15-row local paging and expandable reconciliation; missing daily rows must remain explicit. Worker attendance owns its task cards, roster, photos, confirmation and detail layouts in `WorkerAttendanceWorkspace.module.css`. Field phone controls retain 44 px targets, multiline checklist labels and local draft state. `FieldTodayWorkspace.module.css` owns project-today composition; keep contextual project tabs accessible on phones. See [field workspace verification](../../docs/erp-field-workspaces-20261107.md).
