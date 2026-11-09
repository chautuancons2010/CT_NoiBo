# ERP interface revision · 05/11/2026

The user rejected the earlier visual direction and the unsolicited login redesign. Login has been restored and the internal workspace has been revised after inspecting actual ERP screens.

## Login preservation

The original large official logo, split composition and `LoginBackdrop` animated construction scene are restored. `LoginPage.module.css` now contains only preservation rules for the existing palette and geometry. It isolates login from workspace tokens and retains its prior text color and primary button elevation. Authentication logic and the existing testing gate remain intact.

## References inspected

- [MISA AMIS accounting](https://amis.misa.vn/amis-ke-toan/): inspected its official [overview screenshot](https://amis.misa.vn/wp-content/uploads/2023/07/BC-tong-quan-2.png) and current product illustration. Navigation is visually separated from the main working area; grouped records, metrics and charts establish the content hierarchy.
- [Odoo 19 dashboards](https://www.odoo.com/documentation/19.0/applications/productivity/dashboards.html): inspected the official [Leads dashboard screenshot](https://raw.githubusercontent.com/odoo/documentation/19.0/content/applications/productivity/dashboards/leads-dashboard.png), including KPI grouping and chart/table composition.
- [SAP Fiori overview page](https://www.sap.com/design-system/fiori-design-web/v1-148/page-types/floorplans/overview-page): consulted the role/task overview pattern. The local visual decisions retain Châu Tuấn branding.

## Changes

- Forest green sidebar, legible names/icons and a solid selected state; 248px expanded and 80px collapsed. The white 56px header and content scroll retain their existing behavior and permission filtering.
- Cool light workspace, white surfaces, slate typography, coherent elevation and 10/16/18px control/surface/overlay corners. Shared tabs use an active underline; form sections have clear group headings; entity headers have a brand accent.
- Dashboard has a focus KPI, restrained status surfaces, aligned numeric baselines and a work queue beside supporting charts. Container queries stack the layout when the actual available content width becomes narrow. Phone KPIs use two columns and a compact final summary so work appears earlier.
- Work category filters and expansion operate on the real scoped read model. They do not synthesize dashboard values or bypass permissions.
- Project portfolio has status tabs/counts, a search/update toolbar, clear identity, responsible person, personnel/worksite counts, date and overdue status. These fields derive from existing `ProjectSummary` data. An optional `initialProjects` prop supports the development reference; production still uses its existing API load.
- Employee identity keeps the existing avatar and name; secondary email stays on one line with ellipsis and its existing full `title`, fixing fragmented text on phones.
- The root scrollbar gutter is removed only when an application shell is present, eliminating the empty outer strip. Login retains its original page behavior.

## Evidence and limits

`node scripts/interface-review-qa.mjs`, using `UI_QA_BASE_URL` for a local development server, covers 320/390/768/1024/1440/1920px. It captures shared reference patterns plus the actual employee and project list components with development fixtures. It checks page/workspace/panel bounds, category and project filters, search, sidebar collapse, password visibility, drawers, Escape and focus restoration. Background API calls are intercepted during this visual run.

Images and measured bounds are in [erp-revision-20261105](ui-evidence/erp-revision-20261105/). Earlier `interface-20261105` images are superseded. Focused tests cover the changed dashboard behavior and existing table, navigation, login and project behavior. Production build and architecture checks are also run.

Final results: 53 focused tests passed; all six viewport runs passed with 71 captures and no page runtime errors or horizontal workspace overflow. Type checking, architecture checks and the optimized production build passed. The production login returned 200 at 1440/390px, retained the construction backdrop and brand panel, rendered the preserved 10px inputs and original green text tokens, and had no runtime errors. The development workspace route returned 404 in production. Measurements are in [production.json](ui-evidence/erp-revision-20261105/production.json).

These checks establish the reviewed visual and component behavior. The previously configured test database did not pass the repository's environment marker check; no initialization or reset was performed. Authenticated business workflows against organization data have not been revalidated.
