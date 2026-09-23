# Châu Tuấn ERP — Master Design System

Generated from verified `ui-ux-pro-max` local datasets on 2026-09-19 and adapted to the existing construction ERP brand and Next.js implementation.

## Product direction

- Product: internal construction operations ERP.
- Platform: responsive web, desktop-first with complete mobile operation.
- Style: Minimalism / Swiss, data-first, high contrast, low visual noise.
- Design dials: variance 4/10, motion 3/10, density 8/10.
- Primary goal: let staff scan status, records and next actions quickly.
- Excluded pattern: marketing hero / feature / CTA layouts are not applicable to authenticated ERP screens.

## Color system

The verified enterprise result recommends trust blue. The verified real-estate result recommends trust teal plus professional blue, which better matches construction and the existing Châu Tuấn identity.

| Role | Value | Usage |
| --- | --- | --- |
| Brand primary | `#0F766E` | Primary actions, focus relationship, brand states |
| Brand secondary | `#14B8A6` | Supporting progress and positive highlights |
| Data accent | `#2563EB` | Charts, data series, informational emphasis |
| Professional blue | `#0369A1` | Links, selected data context, secondary information |
| Attention | `#EA580C` | Pending/attention states, never as the only signal |
| Canvas | `#F0FDFA` | Main workspace background |
| Neutral canvas | `#F8FAFC` | Header gradient and nested workspace background |
| Surface | `#FFFFFF` | Cards, tables, forms, overlays |
| Foreground | `#0F172A` | Primary text |
| Muted foreground | `#475569` | Secondary text |
| Border | `#E2E8F0` | Standard separators and component boundaries |
| Destructive | `#DC2626` | Destructive actions and error states |

All component code uses semantic CSS variables. Feature pages must not introduce raw color values.

## Typography

- Family: Inter for headings, body and UI labels. This is the verified Minimal Swiss pairing for dashboards and enterprise design systems.
- Weights: 400 body, 500 labels, 600 headings and actions.
- Scale: 12 / 14 / 15 / 17 / 26px through shared tokens.
- Numeric data uses tabular figures.
- Normal text contrast remains at least 4.5:1.

## Geometry and density

- 4/8px spacing rhythm.
- Controls: 44px standard height; compact controls remain at least 36px on desktop.
- Cards: 12px radius; dashboard/panels: 16px; controls: 9px.
- Table header: 44px; standard row: 52px; compact row: 48px.
- Page padding: 32px desktop, 16px mobile.
- Section gap: 24px standard, 20px compact/mobile.
- Touch interactions remain at least 44px where mobile users operate them.

## Application shell

- Desktop: dark trust-teal sidebar, bright sticky top bar, light data canvas.
- Mobile/tablet: compact top bar with a permission-aware `Ứng dụng của tôi` drawer; no global bottom navigation.
- Module destinations use horizontally scrollable context tabs below the top bar when more than one permitted destination exists.
- Sticky bottom areas are reserved for the current workflow CTA, never for global module navigation.
- Active navigation combines label, weight, surface and leading indicator; color is not the only cue.
- Search remains in the top bar. Destructive/session actions stay spatially separate from navigation.
- Detail screens preserve route-based back navigation and breadcrumbs.

## Components

- Cards use white surfaces, visible borders and restrained depth.
- KPI cards use a semantic leading border and a very soft gradient, never a full saturated fill.
- Tables use clear headers, row separators, a subtle alternate row and blue selected state.
- Forms keep visible labels, inline errors and focus rings. Placeholder text never replaces a label.
- Primary actions use the configured brand color. Secondary actions use a white surface and visible border.
- Status badges always contain text and a boundary; status is never represented by color alone.
- Modal/drawer layers use the shared floating shadow and trap focus.

### ERP form contract

- Preserve the business field order and workflow defined by each module; standardization applies to field chrome and interaction states only.
- Every control has a persistent label. Required fields use the shared required marker and the native `required` attribute.
- Standard controls are 44px high. Textareas start at 112px and resize vertically.
- Read-only values use a quiet neutral surface and remain selectable; disabled controls use lower emphasis and a not-allowed cursor.
- Validation uses an error border, an inline message linked with `aria-describedby`, and `role="alert"`. Forms with multiple errors also show a focusable linked summary.
- Numeric values use tabular figures and right alignment. Dates and times use semantic native input types.
- Related checkbox, radio and switch controls use 44px interaction rows with explicit labels and disabled semantics.
- Filter bars use the same input geometry, keep search first, and visually separate data actions from filter fields.
- Long create/edit forms use the shared sticky action bar with secondary actions before one primary save/submit action.
- Never use placeholder text as a label or use color as the only error/status indicator.

## Data visualization

- Trends over time use a line chart for four or more points.
- Performance against target uses compact bullet/progress presentation for multiple KPIs.
- A single target may use a gauge only when the target and threshold are explicit.
- Charts keep visible labels/legend and a table or textual summary fallback.
- Series use line style/labels in addition to hue. Red/yellow/green alone is prohibited.
- More than six time-series lines must be split or progressively disclosed.

## Motion

- Motion is subtle and functional: 150–250ms for interaction state, small 1–2px movement.
- Animate transform/opacity only; do not animate layout dimensions.
- No decorative scroll reveal is required for ERP working screens.
- `prefers-reduced-motion` disables non-essential transitions and loading motion.

## Responsive and accessibility

- Verify 375 / 768 / 1024 / 1440px and wide desktop up to 2560px.
- Standard tables switch to mobile records or use a controlled horizontal scroll.
- Keyboard focus remains visible and is not obscured by sticky UI.
- Icon-only controls have accessible names; decorative icons are hidden from assistive technology.
- Empty, loading and error states preserve layout and provide an actionable recovery path.
- Zoom from 80% through 150% must not create horizontal page overflow.

## Anti-patterns

- No marketing hero blocks inside authenticated working screens.
- No pastel wall of cards, glassmorphism, oversized radii or decorative blur.
- No emoji as structural icons; use the existing Lucide SVG family.
- No per-page hex colors, arbitrary shadows or independent spacing scales.
- No hover-only operation, hidden form labels or status conveyed only by color.
- No permanent loading spinner where a skeleton can preserve layout.
