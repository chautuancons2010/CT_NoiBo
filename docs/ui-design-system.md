# Châu Tuấn ERP — UI design system

Updated 2026-11-05 after the user's correction. Current component ownership and measurements: [ERP UI contract](../design-system/chau-tuan-erp/ERP.md). Live development references: `/design-system` and `/ui-preview/workspace`. See [the current ERP revision](erp-interface-revision-20261105.md) for scope and verification limits. Earlier audit counts are historical evidence and do not establish visual acceptance.

## Ownership and cascade

1. `src/styles/tokens.css` owns primitive and semantic values: color, type, spacing, density, radius, depth and shell geometry.
2. `src/app/theme.css` maps compatibility classes and configured appearance settings to those tokens.
3. `src/app/mobile.css` provides responsive compatibility for specialized workflows.
4. `src/styles/legacy.css` loads 17 historical stylesheets, each inside `@layer legacy`, for compatibility. `src/styles/erp-components.css` owns the current components. `ApplicationChrome.module.css` owns the shell; `WorkCalendar.module.css` owns calendar geometry. Feature CSS Modules compose business content.
5. Shared primitives and enterprise components compose dashboard/list/form/detail/report templates. Feature code owns data, business validation and permission checks.

Keep existing CSS as a compatibility layer. Fix shared controls in their shared component or canonical stylesheet instead of adding a page-specific override.

## Tokens

| Concern | Canonical tokens / owner |
| --- | --- |
| Workspace | `--workspace-canvas`, `--surface`, `--surface-elevated`, `--surface-border` |
| Reference material | `--reference-surface`, `--reference-border`, `--reference-shadow`, `--reference-control-shadow`, `--reference-panel-radius` |
| Reference charts | `--reference-orange`, `--reference-cyan`, `--reference-yellow`, `--reference-green`, `--reference-violet`, `--reference-ring-track` |
| Brand | Configurable `--primary`, `--primary-hover`, `--primary-soft`; appearance settings remain authoritative |
| Status | `--success`, `--warning`, `--danger`, `--info` with soft partners; always show text |
| Data | Semantic `dataVisualizationPalette`, preserving point tone |
| Typography | Inter; `--font-page`, `--font-section`, `--font-card`, `--font-body`, `--font-meta`; tabular figures |
| Spacing | `--space-*`, `--page-padding-*`, `--section-gap`, `--grid-gap`, `--card-padding` |
| Geometry | `--radius-control`, `--radius-card`, `--radius-card-large`, `--radius-panel`; full-width working surfaces |
| Depth | `--shadow-sm`, `--shadow-md`, `--shadow-card`, `--shadow-card-hover`, `--shadow-floating`, `--shadow-control` |
| Shell | `--sidebar-width`, `--sidebar-collapsed-width`, `--topbar-height` (64px) |
| Controls | `--control-height-*`; phone controls and primary touch targets at least 44px |
| Tables | `--table-header-height`, `--table-row-height`, `--table-cell-padding-x` |
| Motion | `--motion-*`, `--ease-*`; respect reduced motion |

## Shell and page hierarchy

- Desktop opens with a 240px warm white sidebar displaying function names beside icons, the organization identity, current module navigation and permission-filtered applications. The footer's `Thu gọn` button collapses it to an 80px icon rail with tooltips; `Mở rộng điều hướng` restores labels.
- The layout choice uses the account-scoped local key `ct:sidebar-layout:v2:<account-id>`. This version starts expanded after the user's request to show labels, then retains explicit compact/expanded choices across reloads. User changes still update the existing preference API. Density and other workspace preferences retain their existing behavior.
- The 64px white header contains search, messaging, notifications and account controls. Creation actions belong to their owning page header. The account menu links directly to password change, independently of employee profiles.
- `PageHeader` / `ResponsivePageHeader` renders one visible `h1` on desktop and phone. `EntityContextHeader` adds record context. Do not repeat the title as a greeting, eyebrow or second heading.
- Phone users retain authorized module access through applications and shared bottom navigation. A small viewport must not impose business permissions or redirect every module to Personal.
- UI shows labels, states and actionable data. No descriptions beneath actions, permissions, navigation or function headings. Detailed guidance belongs in documentation.

## Shared components

- `Button`, `IconButton`, `Card`, `StatusBadge` own action, surface and status styles.
- `DataTable` / `Worklist` own sorting, record navigation, selection and responsive records. Primary mobile identity follows column priority. Standard tables use horizontal separators and no vertical cell borders.
- `FilterBar` keeps search and up to two desktop filters inline. Larger sets use `FilterSheet`; phone filters also use the sheet. Fields stay mounted and belong to the original form via the `form` attribute. Apply submits the original form; Reset retains each list's reset behavior.
- `Select` uses `SelectControl` and `FloatingPanel`. Long lists support Vietnamese accent-insensitive search. Arrows/Home/End/Enter, outside dismissal, Escape, active option scrolling, disabled and empty states are shared. A hidden native select preserves `FormData`, existing change handlers, reset and required validation.
- `ComboboxControl` supports a free value and keyboard option selection without browser datalist UI.
- `DropdownMenu` portals row actions above scrolling tables, supports keyboard opening/navigation and restores focus. Floating panels stay inside the viewport and a parent dialog's focus boundary.
- `Modal` and `Drawer` trap/restore focus, lock background scroll and dismiss the uppermost popup first. Nested menu/select Escape must not close the parent.
- Shared fields, `FormSection` and `StickyActionBar` preserve business field order, explicit labels, native form semantics and validation. Inline errors remain visible.
- Loading, empty, error, permission and retry states use shared state components.

## Dashboard

`DashboardView` keeps the authorized application bar visible above its title, retaining permission filtering and pinned order. `ModuleLauncher.module.css` owns its grid, tiles and menu variant. The header provides an application menu for switching modules. Below the application bar, the existing scoped read model supplies up to five role-specific metrics, the work queue, then at most two meaningful charts. Charts retain accessible tabular data and CSV export with spreadsheet formula protection. Do not synthesize trends, fake counts or tasks to fill a reference layout. Account-scoped personal tasks and notes retain their APIs through `PersonalWorkspaceCards`.

## Validation

Run `lint`, `typecheck`, `test`, `build`, `ui:audit`, `ui:architecture-audit` and `ui:screen-audit`. `ui:reference-qa` checks the reference material, real KPI/gauge values, labelled sidebar, compact/expanded persistence, header control spacing and responsive dashboard/list screens for three roles. Its sidebar scenario mocks the two preference PUTs locally and does not modify the server preference. `ui:release-qa` checks authenticated production views at phone/tablet/desktop widths. `ui:interaction-qa` checks filter persistence, empty/reset, keyboard menus, nested select dismissal and negative permissions without submitting business records. `ui:core-qa` uses development previews.

Static route coverage is not business UAT. See [production review](UI_UX_PRODUCTION_REVIEW_2026-10-03.md) for measured coverage and [production readiness](operations/production-readiness.md) for deployment prerequisites. Preview routes stay inaccessible in production.

## Local refinement — 06/11/2026

The user requested a lighter system inspired by the Dtech landing page. Tokens remain the single owner of palette, material, density, radii and depth; shared component owners implement their geometry. Do not add a finishing stylesheet or per-page color overrides. The login scene and all business permissions/actions remain outside this visual redesign.

`GlobalLoadingIndicator` now uses a delayed, nonblocking top progress bar for page transitions only. Actions keep local feedback. `LoadingExperience.module.css` owns shared page/table/card placeholders and reduced motion. Navigation indicators do not change the width of links. Local preview and review are required; do not push GitHub, deploy, or modify hosted database schema without a new explicit request.

`FormWorkspace` owns the primary/secondary form composition; the employee create form retains all 28 named fields and uses its existing sticky actions. Connection degradation remains visible as periodic synchronization, with the detailed state available in the status title; it is never presented as a healthy live connection.
