# Interface revision · 05/11/2026

**Historical revision, superseded after user rejection.** The login redesign described below was rolled back to its established logo, split layout and animated background. The current internal interface and verification are documented in [ERP interface revision](erp-interface-revision-20261105.md). Screenshots in `interface-20261105/` describe the earlier proposal and are not the current target.

The user's direction is a complete, modern operational interface with a deliberate visual identity. This revision changes shared UI foundations and the login/dashboard composition. It keeps the configured Châu Tuấn identity and the repository's rule: labels, status and actionable data, without descriptions beneath functions or navigation.

## Design decisions

- Neutral working canvas `#f5f6f4`, white surfaces, charcoal text and quiet neutral dividers. Green identifies active navigation and primary actions. Status colors retain their meaning.
- Consistent 8px controls, 12px surfaces and 16px overlays; subtle shared elevation. Inter includes all existing weights and Vietnamese character coverage.
- Sidebar uses tighter type, predictable spacing, a visible active marker, hover and keyboard focus. The expanded/collapsed widths and account preferences retain their behavior.
- Dashboard application shortcuts remain above its title. The bar scrolls internally, with compact icon/label shortcuts on phones. Pinned order and permission filtering stay in `ModuleLauncher`.
- Metrics display label then value, with a secondary icon and a small navigation cue for linked values. Icon colors follow metric status. Live dashboard data selection is unchanged.
- Tables use neutral headers, light separators, row hover, selection markers and tabular numerals. Form sections have a clear header divider. Fields, buttons, menus and overlays share the same tokens.
- Login uses an official brand panel and a focused form on desktop; phones use a single column. Existing login, password visibility, error focus and pending states remain functional.
- Shared motion tokens resolve to zero when reduced motion is requested.

The visual choices are local design decisions. [SAP's design system guidance](https://www.sap.com/design-system/fiori-design-web/v1-136/discover/sap-design-system/sap-fiori) informed the emphasis on tokens, typography, visual hierarchy and consistent cross-device patterns.

## Implementation ownership

`src/styles/tokens.css` owns global decisions, `src/styles/erp-components.css` owns shared controls, and `ApplicationChrome.module.css` owns the shell. `ModuleLauncher.module.css`, `DashboardView.module.css` and `LoginPage.module.css` own their scoped composition. No new global finishing stylesheet was added.

## Development reference

- `/ui-preview/workspace`: the actual header, sidebar, application launcher and dashboard with sample data.
- `/ui-preview/workspace?screen=reference`: the same shell with the shared list/detail/form/calendar/component reference.
- These are development routes and return not-found in production. Fixtures never feed authenticated business routes. This is a visual reference, not an authorization bypass.

## Evidence and verification

`node scripts/interface-review-qa.mjs` runs against a local development server and intercepts preview API calls. It reviews 320, 390, 768, 1024, 1440 and 1920px, records layout bounds, and captures login, dashboard, collapsed navigation, list, form, calendar, search, filter/select, confirmation and drawer screens. Interactions cover password visibility, sidebar collapse, application scrolling, record search, filter selection, opening overlays, Escape and restoring focus. Visible panels are checked against viewport boundaries.

Evidence: [screenshots and measurements](ui-evidence/interface-20261105/). All six viewport runs passed after the final compact phone shortcut refinement, with no page runtime errors or horizontal page/workspace overflow.

The focused existing unit runs passed 47 tests across navigation, controls, table behavior, login, overlays, dropdowns and filters. Type checking, the centralized UI architecture audit and the production build passed. The build logged `system_settings.read_failed` and used the application's fallback settings because the current configuration service was unavailable.

The final production server returned 200 for login at 1440 and 390px, with no runtime errors or horizontal overflow. Rendered inputs used the 8px control radius and reduced-motion tokens resolved to `0ms`. `/ui-preview/workspace` returned 404. See [production measurements](ui-evidence/interface-20261105/production.json).

The configured test database did not pass the existing environment marker check. No database initialization or reset was performed. Authenticated business workflows and organization-specific data were not verified in this revision; fixture screenshots do not establish that acceptance.
