# Bright Enterprise ERP UI

The product uses a trust-teal canvas, crisp white surfaces, professional blue data accents, restrained semantic color and compact data-first geometry. Color clarifies modules, metrics and status without turning operational screens into marketing pages. Standard cards use 12px radii, large dashboard surfaces use 16px, and borders remain visible in every data-heavy view. The hierarchical source of truth is `design-system/chau-tuan-erp/MASTER.md`, with page overrides under its `pages` directory.

## Architecture

`design-system/chau-tuan-erp/MASTER.md` is the design contract and `src/app/theme.css` is its executable token mapping. Detailed create/edit/filter behavior is specified by `design-system/chau-tuan-erp/pages/forms.md`. The theme loads after `globals.css` from the root layout. Existing module class names continue to work through compatibility selectors in the theme. New presentation code should use shared components from `src/components/shared` and semantic tokens from the theme. `src/app/globals.css` still contains historical layout and module rules; the migration is in progress. Do not add new visual constants there.

The authenticated application has one shell: `AppShell` → `AppRail`, `AppHeader`, `page-main`. The shell owns global search, quick create, notifications, account menu, route context and mobile navigation. Quick create uses the existing permission filtered action registry.

The application has one personal Dashboard at `/dashboard`. Legacy `/home` and module dashboard routes redirect to the personal Dashboard or the module's primary working screen. The third reference image defines the required dashboard information architecture: personalized greeting, module launcher, KPI cards, trend and donut analytics, schedule/deadlines, notifications, warehouse/project/HR operations, recent data, tasks and personal notes. Each business widget is hidden when its permission is absent.

Module presentation is centralized in `src/config/moduleIconRegistry.ts`. Change a module icon or accent there. `ModuleLauncher` filters `applicationRegistry` through the current user's permissions; `ModuleIconCard` owns the shared tinted surface, hover, focus and pressed behavior. Feature pages must not define module colors themselves.

## Tokens

| Concern | Tokens | How to change |
| --- | --- | --- |
| Page and surface | `--app-bg`, `--app-bg-soft`, `--surface`, `--surface-elevated`, compatibility aliases `--surface-1`, `--surface-2`, `--surface-hover` | Edit the root declaration in `theme.css` |
| Text | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled` | Edit root tokens; keep normal text contrast at or above 4.5:1 |
| Accent | `--erp-primary`, `--erp-secondary`, `--erp-accent`, `--erp-data-blue`, `--erp-attention`; configurable brand aliases `--primary`, `--primary-hover`, `--primary-soft` | Change system accents in `theme.css`; change configured action color through appearance settings |
| Soft accents | Legacy-compatible `--pastel-*` aliases and the `--blue-*`, `--mint-*`, `--lavender-*`, `--orange-*`, `--yellow-*`, `--cyan-*`, `--rose-*` scales | Use only for subtle module/KPI/status treatment; do not put literal hex in a page |
| Chart accents | `--accent-violet`, `--accent-cyan`, `--accent-green`, `--accent-orange`, `--accent-blue`, `--accent-red` | Charts consume these semantic accents through `dataVisualizationPalette` |
| Status | `--success`, `--warning`, `--danger`, `--info` and their `-soft` partners | Change semantic tokens; labels must still convey status |
| Space | `--space-1` through `--space-12`, `--page-padding-x`, `--page-padding-y`, `--section-gap`, `--grid-gap`, `--card-padding` | Change a layout token for all matching pages |
| Radius | `--radius-control`, `--radius-button`, `--radius-nav`, `--radius-card`, `--radius-card-large`, `--radius-panel`, `--radius-pill` | Change the semantic token; standard cards currently use 12px and large dashboard cards use 16px |
| Shadow | `--shadow-sm`, `--shadow-card`, `--shadow-card-hover`, `--shadow-floating` | Adjust one token for each depth |
| Control | `--control-height-sm`, `--control-height-md`, `--control-height-lg` | Change control heights centrally |
| Table | `--table-header-height`, `--table-row-height`, `--table-cell-padding-x` | Change all standard `DataTable` instances |
| Shell | `--sidebar-width`, `--sidebar-collapsed-width`, `--topbar-height` | Change navigation geometry |
| Motion | `--motion-fast`, `--motion-normal`, `--motion-slow`, `--ease-standard`, `--ease-exit` | Change motion centrally; reduced motion is respected |
| Layers | `--z-header`, `--z-dropdown`, `--z-overlay`, `--z-modal`, `--z-toast` | Keep stacking order centralized |
| Type | `--font-page`, `--font-section`, `--font-card`, `--font-body`, `--font-meta` | Inter 400/500/600 is loaded in the root layout; headings default to 600 |

App appearance settings still own the primary brand color and compact/comfortable density. `theme.css` maps those settings to the same component tokens.

## Shared components

- `Button` and `IconButton`: `primary`, `secondary`, `soft`, `ghost`, `danger`; sizes `sm`, `md`, `lg` for `Button`.
- `Card`: semantic variants `neutral`, `blue`, `mint`, `lavender`, `orange`, `yellow`, `cyan`, `rose`; padding `none`, `sm`, `md`, `lg`. Use `interactive` only when the card itself has an action.
- `DashboardPageTemplate`, `ListPageTemplate`, `FormPageTemplate`, `DetailPageTemplate`, `ReportPageTemplate` and their layout primitives: page composition.
- `MetricCard`, `ChartCard`, `AnalyticsCard`, `ProgressCard`, `ActivityCard`, `TaskCard`: dashboard surfaces. KPI cards use a white-to-soft-accent gradient, semantic leading border and shared large radius.
- `ModuleLauncher` and `ModuleIconCard`: permission aware direct links to the user's modules, backed by `moduleIconRegistry`.
- `DataTable`, `FilterBar`, `Pagination`, `DropdownMenu`, `StatusBadge`: lists and actions. Put row actions in `DropdownMenu`. Use semantic badge tones.
- `PageActionBar`, `TableActionBar`, `ActionButton`, `CompactActionMenu`: one responsive action policy for page headers and data tools.
- `FormSection`, `Input`, `Select`, `Textarea`, `DatePicker`, `Checkbox`, `Radio`, `Switch`, `FormErrorSummary`, `StickyActionBar`: ERP forms. Shared fields own required, invalid, read-only and disabled states; feature code owns business order and validation rules.
- `PasswordInput`: shared visibility toggle for login and password management without changing the field value or auth flow.
- `ImageUploader`: local preview, validation, progress, retry, replace, remove and object URL cleanup. Avatar, messaging attachments and worker attendance evidence use this component.
- `GlobalRouteLoader`, `ModuleTransition`, `PageSkeleton`, `TableSkeleton`, `CardSkeleton`, `ChartSkeleton`: loading feedback that keeps the authenticated shell stable.
- `Modal`, `Drawer`, `EmptyState`, `ErrorState`, `LoadingState`, `Skeleton`: floating and state UI.

List pages should compose `PageHeader` → a single `DataSurface` with filter, table and pagination. Forms use a page header and `FormSection` with a two column grid on desktop. Detail pages use entity header, tabs and related sections. Module code owns data and actions; shared components own geometry and visual states. The repository UI rule forbids descriptive text under each action, permission or navigation item.

## Interaction and accessibility

Buttons rise 1px on hover, interactive cards rise 2px, rows tint without movement, navigation links move 2px horizontally and icon buttons scale to 1.02. Floating surfaces fade and move 3px using `--shadow-floating`. Focus uses the configured primary ring. Icon buttons require an accessible `label`. Form labels, helper text and inline errors are separate accessible relationships; multi-error forms use a linked focusable summary. Color never carries status alone; visible labels remain mandatory. `prefers-reduced-motion` disables these transitions and animations.

## Do and don't

```tsx
<Card variant="mint" padding="lg" />
<Button variant="soft">Xem</Button>
<StatusBadge tone="warning">Chờ xử lý</StatusBadge>
```

Avoid literal `rounded-[17px]`, `bg-[#...]`, page-specific button classes, bordered page title boxes, vertical table cell borders and repeated edit buttons in rows. A new page should use a page template; a new visual state belongs in a shared variant or token.

## Migration audit and plan

Audit on 2026-09-17: 178 authenticated routes, 153 files referencing `page-stack`, and 226 JSX references to key shared components were found. Existing design primitives covered many modules, but `globals.css` had more than 8,000 lines and repeated late overrides for card radius, table density, page title borders, forms and dashboard. The current working tree already included many independent changes before this UI pass; they were left intact.

Completed in this pass: bright ERP theme tokens and compatibility mapping, shell quick create, core button/card variant API, dashboard/list/form/detail/report templates, employee list/create/detail composition, shared dashboard card primitives, semantic KPI geometry, custom line/bar/circular analytics, dashboard recent activity table and dev-only `/__ui` preview. The personal Dashboard includes the current user's greeting, permission aware module launcher, contextual date, real KPI/chart data, schedule/deadline and notification rail, operational module widgets, recent data, tasks, and persisted personal notes and todos. Shared CSS applies to the existing module markup across the authenticated app.

Explicit templates are now used by the employee pages and main surfaces in projects, warehouse, import/export, attendance, timesheets, accounting, insurance, leave, organization and roles. All standard feature tables use `DataTable`. Three native tables remain by design because their interaction model is tabular rather than a record list: work calendar, timesheet matrix and inline stock count editor. The audit script enforces this allowlist. Duplicate unused `ReportTemplateManager`, `ReportTemplateSettings`, `WarehouseDashboardView`, and `ImportExportDashboardView` implementations were removed. Module dashboard links were removed from navigation; their old routes remain as redirects for bookmarks. Historical selectors in `globals.css` remain as a compatibility layer for specialized module layouts; new visual decisions are enforced through shared components and the UI audit. The shared playground is available at `/ui-preview` and `/__ui` only in development; both return 404 in production.

Validation on the current working tree: `npm run typecheck`, `npm run lint`, `npm test` (59 files, 200 tests), `npm run build`, `npm run ui:audit` (180 authenticated routes), and `npm run ui:qa` passed. Viewport QA verifies login at 320–2560px, zoom, font loading, protected route redirects, plus the shared playground at 390px and 1440px. It asserts the bright canvas, 12px card radius, 44px control height, KPI cards, DataTable, error/read-only/disabled field states, filter bar and action bar, then saves screenshots in `docs/ui-evidence`. `/ui-preview` intentionally returns 404 in production. Run the development seed against a disposable Supabase instance before manual authenticated workflow QA. Build logged `system_settings.read_failed` while generating pages because the local settings data source was unavailable, but the command finished successfully.

## Personal data, attachments and retention

Personal notes, todos and UI preferences use account scoped database tables through the workspace API. Avatar files and message attachments use private storage with permission checked download routes. Message creation accepts multipart content and finalizes the message only after attachment metadata is linked; a failed upload can be retried without selecting the file again.

Attendance evidence stays private. The daily maintenance flow deletes storage objects older than 45 days, preserves attendance and audit records, clears file references and marks evidence as expired. The migration and maintenance service cover employee attendance and worker roll call photos.

### Global change scenarios

1. All standard card radius: edit `--radius-card`; large dashboard cards use `--radius-card-large`.
2. More room across pages: edit `--page-padding-*`, `--section-gap`, `--grid-gap` and `--card-padding`.
3. Softer standard row hover: edit `.data-table tbody tr:hover` in `theme.css`.
4. Primary color: change the appearance setting, which feeds root layout brand tokens; buttons and focus ring follow.
5. Button height: edit `--control-height-md` (or the size-specific token).
6. Sidebar width and active treatment: edit `--sidebar-width` and `.app-rail__link.is-active`.
7. Page title to content gap: edit `--section-gap` or the page template rule.
8. Module icon or accent: edit the module entry in `moduleIconRegistry`.

When a module-specific selector prevents one of these from propagating, remove that local styling and use the shared primitive before adding another override.
