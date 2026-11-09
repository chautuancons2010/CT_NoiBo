# ERP UI contract

Implementation reference: `/design-system` in development. It uses the business components and renders the not-found screen in production. This contract supersedes the historical finishing styles and earlier visual audits.

## Reference decisions

- [Odoo: views](https://www.odoo.com/documentation/19.0/applications/productivity/studio/views.html): use consistent list/form composition, tabs and a clear primary action.
- [Odoo: search, filter and group records](https://www.odoo.com/documentation/19.0/applications/general/search.html): keep search and filtering above the working records.
- [MISA AMIS: attendance tables](https://helpamis.misa.vn/amis-cham-cong/kb/lap-bang-cong-tach-theo-dia-diem-lam-viec-cua-nhan-vien/): keep period and employee context with the table, with filter/export/customization tools grouped by their task.
- [MISA AMIS: switching applications](https://helpamis.misa.vn/amis-cong-viec/kb/toi-muon-dang-nhap-vao-ung-dung-de-su-dung-thi-lam-the-nao/): retain the visible application launcher on the home page and access to authorized applications from within a module.
- [SAP Fiori with Horizon](https://www.sap.com/design-system/fiori-design-web/v1-136/discover/sap-design-system/sap-fiori): use softer corners, readable typography and consistent visual hierarchy. The local choices below retain the Châu Tuấn palette.

These inform the interaction hierarchy. The Châu Tuấn measurements and calendar/inspector composition below are local design decisions, not vendor specifications. No vendor brand colors, logos or new accounting scope are introduced.

## Ownership

| Scope | Owner |
| --- | --- |
| Brand, type, spacing and dimensions | `src/styles/tokens.css`; runtime branding |
| Shell, navigation, header and content scrolling | `ApplicationChrome.module.css` |
| Shared controls, tables, tabs, surfaces and states | `src/styles/erp-components.css` |
| Application tiles and dashboard application bar | `ModuleLauncher.tsx` + `ModuleLauncher.module.css` |
| Calendar geometry and keyboard navigation | `WorkCalendar.tsx` + `WorkCalendar.module.css` |
| Business composition and data | Feature component and CSS Module |
| Record identity, tabs and read-only fields | `RecordHeader` / `RecordFields`; `erp-components.css` and tokens |
| Grouped drawer forms and list summaries | `SectionedForm` / `FieldGroup` / `FormActions`; `erp-components.css` and tokens |
| In-page forms and responsive field grid | `InlineForm` / `FormFields`; `erp-components.css` |
| Historical compatibility | 17 stylesheets explicitly inside `@layer legacy`, loaded through `legacy.css` |

The root imports tokens, compatibility and the ERP component source. New global finishing styles and new compatibility rules are prohibited. The architecture audit checks this boundary. Scoped business composition consumes the shared control sizes and brand tokens.

## Measurements

| Element | Desktop | Phone |
| --- | --- | --- |
| Header | 64px | 56px |
| Navigation | 240px; collapsed 80px | Application menu |
| Content gutter | 28px; 40px from 1600px | 12px |
| Page title | 26px / 600 | 20px / 600 |
| Body / label / metadata | 14px / 13px / 12px | Same |
| Row action / toolbar / form | 32px / 36px / 40px | Minimum 44px |
| Input text | 14px | 16px |
| Table row | 52px minimum | Compact records |
| Calendar cell | 64px | 56px |
| Control / surface / overlay radius | 10px / 16px / 20px | Same |

Keep Inter, the green brand, logo and configured identity. The workspace takes its material and palette from the Dtech landing page: warm white navigation, ivory canvas, white working surfaces, green ink and sage selection. Primary actions retain the configured brand color. The focus metric uses a soft sage surface; other metrics preserve their semantic status. Load complete character sets at 400, 500, 600 and 700, including Latin and Vietnamese. A Vietnamese-only bold face can make Latin characters fall back to Times New Roman. Use the existing Lucide icons, subtle borders and shared surface elevation. Floating menus use the floating elevation token. Login retains its established layout, animated background and isolated original palette; workspace changes must not restyle it.

Keep reset selectors at zero specificity so they cannot override component text colors or font weights. Primary links and buttons share the same foreground. Status badges use restrained pill shapes; tabs have a soft active background. Desktop drawers attach to the right edge at full height. Phone drawers attach to the bottom at full width. Modal dialogs remain centered. Focus, Escape and background locking belong to the overlay implementation.

The development reference opens on **Thành phần**, exposing live buttons, fields, selectors, state badges, tabs, uploads, menus and overlays. The four screen patterns remain available beside it. The real Dashboard keeps its application bar above the title, preserving permission filtering and pinned order. Work categories filter actual scoped queue items; expansion reveals the remaining items. Container width determines when KPI and analytics columns stack. `/ui-preview/workspace` renders the actual shell and dashboard with development fixtures; `?screen=reference` renders shared patterns; `?screen=employees` and `?screen=projects` render the actual business list components with sample records. These references return not-found in production.

The shell fits the viewport. Header and rail remain stable. Content and the rail's navigation list scroll independently. A route change resets content position without moving navigation. Viewport width never changes business permissions.

## Shared functional composition — 09/11/2026

`ListWorkspace` owns in-function navigation, necessary summary, filters, result status, records and footer. Use slots rather than repeated metric cards/state selectors. `WorkspaceMetrics` keeps supporting totals inside the task surface. `RecordHeader` owns one identity/navigation; `RecordSheet` / `RecordSection` group record data. `SecondarySection` discloses optional history/tools. Dashboard work precedes optional analytics. Preserve specialized photo review, calendar, document entry and attendance flows. See [system review](../../docs/system-workspace-review-20261109.md).

## Four screen patterns

| Pattern | Composition | Limits |
| --- | --- | --- |
| List | Title/count/action → search/filter → table → pagination | One working surface; desktop retains columns and internal scrolling; phone expands secondary fields |
| Detail | Code/name/status/actions → tabs → fields or records | Shared header and active tab; no duplicate titles or nested decorative frames |
| Form | Title → field groups → Hủy/Lưu | Maximum 920px; two columns, one on phone; errors beside the fields |
| Calendar | Employee/period → calendar + inspector | Maximum 1120px; 288px inspector on desktop; stacked summary and day drawer on phone |

Calendar cells share a gap-based grid, including blanks. Empty days show a date without a repeated placeholder badge. Personal attendance and employee timesheets use the same component. Stored summary totals remain separate from daily records; the reconciliation warning stays visible when they differ.

## Interaction and acceptance

- One primary action per context. Labels, status and actionable data only.
- Filtering preserves its form, values and Apply/Reset behavior. Search remains visible.
- Loading, empty, error and denied states use shared components.
- Menus/select panels stay in the viewport. Dialogs retain focus, Escape order and a close action.
- Calendar supports arrows and Home/End with one tab stop; selecting a date shows its actual data.
- Admin remains an administration account; own account security is independent of HR data.
- Inspect the four reference patterns and real routes at 320, 390, 768, 1440 and 1842px. Check full navigation bounds, calendar boundaries and selected-day interaction.
- Verify production CSS as well as development. Unit and static audits do not replace visual review.

## Local refinement — 06/11/2026

The user requested a lighter system inspired by the Dtech landing page. Tokens remain the single owner of palette, material, density, radii and depth; shared component owners implement their geometry. Do not add a finishing stylesheet or per-page color overrides. The login scene and all business permissions/actions remain outside this visual redesign.

`GlobalLoadingIndicator` now uses a delayed, nonblocking top progress bar for page transitions only. Actions keep local feedback. `LoadingExperience.module.css` owns shared page/table/card placeholders and reduced motion. Navigation indicators do not change the width of links. Local preview and review are required; do not push GitHub, deploy, or modify hosted database schema without a new explicit request.

`FormWorkspace` owns the primary/secondary form composition; the employee create form retains all 28 named fields and uses its existing sticky actions. Connection degradation remains visible as periodic synchronization, with the detailed state available in the status title; it is never presented as a healthy live connection.

## Document and filter interaction

`Workbench.tsx` exports `EditableLines`, `EditableLine` and `DocumentActions`. Required document context precedes line entry. Optional allocation, delivery and notes follow the lines in native disclosures; required project allocation remains in the primary fields. The owning form retains its submitter and handlers. The shared action area stays within view during entry; reloading a dirty document requires confirmation. Desktop uses aligned input columns and phone uses labeled fields. Geometry belongs to `erp-components.css`; line index/action dimensions and docked elevation belong to tokens.

`FilterBar` supports a separate search action, applied-criterion chips, clear-all and pending state. Its sheet reveals labels even when compact inline controls hide them. Draft resets do not apply until Apply. Removing an applied employee criterion retains the other applied values and page size, and resets page to 1. Empty filtered results use a distinct label from an empty register. Keep search, permission filtering and the original form association intact.
