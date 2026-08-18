# Design QA — order 记账管理

- source visual truth path: `/var/folders/j4/79sh568x1gb_08cx0v8h9q5r0000gn/T/TemporaryItems/NSIRD_screencaptureui_fp0WTx/截屏2026-08-14 17.50.56.png`
- implementation screenshots:
  - `/Users/dave/.codex/visualizations/2026/08/14/shoes-accounting-qa/accounting-empty.png`
  - `/Users/dave/.codex/visualizations/2026/08/14/shoes-accounting-qa/accounting-saved-expanded.png`
  - `/Users/dave/.codex/visualizations/2026/08/14/shoes-accounting-qa/order-menu.png`
  - `/Users/dave/.codex/visualizations/2026/08/14/shoes-accounting-qa/menu-comparison.png`
- viewport: Codex in-app browser default desktop viewport, 1265 × 712 captured pixels, device scale factor 1
- source pixels: 220 × 102
- implementation menu crop: 220 × 160; comparison board displays both crops at 248 CSS px wide to compare item styling while retaining the added middle row
- state: order role, `Gestion comptable` active; empty page and saved/expanded cash plus saved expense states

## Full-view comparison evidence

The new page reuses the existing order shell, typography, surfaces, palette, radii and icon library. The desktop page keeps all three core areas visible together: cash counting, daily expense entry and saved records. Empty and saved/expanded states were captured at the same viewport.

## Focused region comparison evidence

The combined menu comparison shows that the new `Gestion comptable` item is inserted exactly between `Saisie commande` and `Gestion des dettes`. Icon size, text weight, left alignment, active charcoal surface and brass active rail match the supplied sidebar reference.

## Required fidelity surfaces

- Fonts and typography: passed; existing global Songti display and SF Pro/PingFang body hierarchy retained.
- Spacing and layout rhythm: passed after the denomination input fix; three panels align on the same top edge without horizontal overflow.
- Colors and visual tokens: passed; existing charcoal, brass, oxblood, emerald and stone tokens used consistently.
- Image quality and asset fidelity: passed; existing brand asset remains unchanged and UI icons use the existing Lucide library. No placeholder or custom drawn asset was introduced.
- Copy and content: passed; order-facing text is French and contains the requested denominations, total, date, amount, remark, edit and delete actions.

## Interaction evidence

- Entered 2 × 10,000 and 1 × 5,000; live total changed to 25,000 XOF.
- Saved the cash count; summary card appeared and expanded to show every denomination count.
- Added a 3,500 XOF `Transport` expense, edited it to 4,200 XOF and `Transport taxi`.
- Opened the delete confirmation and cancelled without deleting test data.
- Changed the date filter to 2026-08-13; both cash and expense areas changed to their empty state.
- Fresh-page console errors and warnings: none.

## Comparison history

1. Initial pass found a P2 layout issue: horizontal denomination rows overflowed inside the narrower cash column.
2. Fixed by stacking the denomination label above a full-width numeric input and tightening the vertical rhythm.
3. Post-fix desktop capture shows all denomination inputs readable, aligned and unclipped. No P0/P1/P2 findings remain.

## Residual test gaps

- The authenticated production account was not used during component interaction QA, so no real cash or expense record was created, edited or deleted.
- Browser viewport override was unavailable for a distinct mobile capture; the existing responsive single-column layout and four-item mobile navigation were verified through code and type/build checks.

final result: passed

# Design QA — 当日订单对账公式

- Source visual truth: `/var/folders/j4/79sh568x1gb_08cx0v8h9q5r0000gn/T/TemporaryItems/NSIRD_screencaptureui_G4j300/截屏2026-08-18 19.35.06.png`
- Browser-rendered implementation: `/Users/dave/.codex/visualizations/2026/08/12/019ff631-7cf4-7220-85b9-5d1414b338ca/accounting-settled-debt-qa/full-page.png`
- Focused implementation crop: `/Users/dave/.codex/visualizations/2026/08/12/019ff631-7cf4-7220-85b9-5d1414b338ca/accounting-settled-debt-qa/implementation-card.png`
- Comparison board: `/Users/dave/.codex/visualizations/2026/08/12/019ff631-7cf4-7220-85b9-5d1414b338ca/accounting-settled-debt-qa/comparison.png`
- Browser viewport: `1280 × 720` CSS px, device scale factor 1.
- Source pixels: `327 × 127`; focused source card: `224 × 91`.
- Implementation full-page pixels: `1265 × 1314`; focused card: `245 × 92`.
- State: admin 记账管理，order 记账日期 `2026-08-18`，差额 `30,000 XOF`。

## Full-view and focused comparison

The surrounding order-accounting header, alert state, hierarchy, typography, red semantic color, border, radius and spacing remain consistent with the supplied screen. The focused comparison verifies the changed formula at readable size. No raster assets are present in this card; the existing Lucide warning icon is preserved.

## Required fidelity surfaces

- Fonts and typography: passed; the existing global display/body font system, weight hierarchy and tabular amount styling are unchanged.
- Spacing and layout rhythm: passed; the longer formula fits within the existing reconciliation card without clipping or changing its height.
- Colors and visual tokens: passed; the existing rose error state, neutral helper copy and white page background remain unchanged.
- Image quality and asset fidelity: passed; no image assets were added or replaced.
- Copy and content: passed; helper copy now reads `订单 − 现金 − 消费 − 欠款 ＋ 当天结清欠款`.

## Interaction and runtime evidence

- Flow under test: local admin accounting component → selected accounting date changes from `2026-08-18` to `2026-08-17` → reconciliation changes from `差额 30,000 XOF` to `账目正确`.
- Page identity and meaningful DOM content passed.
- No Vite/framework overlay appeared.
- Browser console errors and warnings: none in the clean verification tab.

## Findings and history

- P0/P1/P2 findings: none.
- No fix iteration was required after the focused source/implementation comparison.
- P3 follow-up: none required for this scoped copy and calculation update.

final result: passed

# Design QA — 欠款结清日期与排序

- source visual truth path: `/var/folders/j4/79sh568x1gb_08cx0v8h9q5r0000gn/T/TemporaryItems/NSIRD_screencaptureui_Od5Iml/截屏2026-08-18 19.06.12.png`
- implementation screenshot: `/Users/dave/.codex/visualizations/2026/08/12/019ff631-7cf4-7220-85b9-5d1414b338ca/debt-settlement-qa/settlement-date-sorting.png`
- comparison board: `/Users/dave/.codex/visualizations/2026/08/12/019ff631-7cf4-7220-85b9-5d1414b338ca/debt-settlement-qa/comparison.png`
- viewport: 1191 × 785 CSS pixels, device scale factor 1
- source pixels: 1191 × 785
- implementation crop: 1128 × 560 pixels from the debt detail section
- state: two unsettled records, three dated settled records and one historical settled record without a stored settlement date

## Full-view comparison evidence

The existing debt-detail surface, title, record count, table density, typography, amount colors, status iconography and action placement remain consistent with the supplied screenshot. The requested `还款结清日期` column is inserted between `欠款日期` and `操作` without clipping or horizontal overflow at the reference viewport.

## Focused region comparison evidence

The combined comparison board normalizes both debt-detail sections to the same 1128-pixel content width. The implementation preserves the original row rhythm while showing settlement dates as `YYYY-MM-DD`; unsettled and historical records without a stored date use a muted em dash.

## Required fidelity surfaces

- Fonts and typography: passed; the existing admin overview font hierarchy and tabular amount styling are unchanged.
- Spacing and layout rhythm: passed; seven columns remain readable and aligned at the reference viewport.
- Colors and visual tokens: passed; existing amber, sky, rose, emerald and slate semantic colors are preserved.
- Image quality and asset fidelity: passed; no raster assets were added and existing Lucide icons remain unchanged.
- Copy and content: passed; the new header is `还款结清日期` and dates use the same format as `欠款日期`.

## Interaction and ordering evidence

- Unsettled rows render first in debt-date order: 2026-08-18, then 2026-08-12.
- Settled rows follow in settlement-date order: 2026-08-18, 2026-08-17, then 2026-08-16.
- The historical settled record without `settledAt` renders last in the settled group with `—`.
- The edit dialog opens and closes normally after the table change.
- Fresh-page console errors and warnings: none.

## Comparison history

- First comparison found no actionable P0/P1/P2 visual or interaction mismatch. No visual correction loop was required.

final result: passed

## Cash card edit and delete verification

- The cash-card pencil now opens a dedicated denomination editor instead of scrolling to the entry form.
- Editing the 10,000 XOF count from 2 to 3 updated the card total from 37,600 XOF to 47,600 XOF.
- The cash-card trash action opens a second confirmation showing the date, total and irreversible-action warning; the QA run cancelled before deletion.
- Screenshots:
  - `/Users/dave/.codex/visualizations/2026/08/14/shoes-cash-edit-qa/cash-edit-modal.png`
  - `/Users/dave/.codex/visualizations/2026/08/14/shoes-cash-edit-qa/cash-delete-confirmation.png`
- Fresh console warnings and errors: none.

# Design QA — admin 当日订单对账

- source visual truth path: `/var/folders/j4/79sh568x1gb_08cx0v8h9q5r0000gn/T/TemporaryItems/NSIRD_screencaptureui_BuRY4p/截屏2026-08-15 20.32.29.png`
- implementation screenshots:
  - `/Users/dave/.codex/visualizations/2026/08/12/019ff631-7cf4-7220-85b9-5d1414b338ca/order-reconciliation-correct-2026-08-15.png`
  - `/Users/dave/.codex/visualizations/2026/08/12/019ff631-7cf4-7220-85b9-5d1414b338ca/order-reconciliation-difference-2026-08-15.png`
  - `/Users/dave/.codex/visualizations/2026/08/12/019ff631-7cf4-7220-85b9-5d1414b338ca/order-reconciliation-comparison-2026-08-15.png`
- viewport: 1100 × 420 CSS pixels, device scale factor 1
- source pixels: 1062 × 126
- implementation pixels: 1265 × 712; header region normalized to the source width and height in the comparison board
- states: `账目正确` and positive `差额 30,000 XOF`

## Formula and data scope

- Selected-day customer order total minus selected-day cash count total, order expense total and customer outstanding debt total.
- All four inputs follow the independent ORDER accounting date picker and are not affected by the page month filter.
- Outstanding debt uses the remaining unpaid balance of customer orders for the selected day.

## Required fidelity surfaces

- Fonts and typography: passed; existing admin dashboard typography retained.
- Spacing and layout rhythm: passed; the reconciliation card occupies the requested center position without disturbing the title or date control.
- Colors and visual tokens: passed; zero difference uses the existing emerald success treatment and nonzero difference uses the existing red warning treatment.
- Icon and asset fidelity: passed; existing Lucide `CheckCircle2` and `AlertTriangle` icons used.
- Copy and content: passed; the card exposes the result and the concise formula `订单 − 现金 − 消费 − 客户欠款`.

## Interaction evidence

- At 2026-08-15, 500,000 − 350,000 − 50,000 − 100,000 = 0 and the card displayed `账目正确`.
- Switching the independent date to 2026-08-14 recalculated the card to `差额 30,000 XOF`.
- The center card updates from the same date selection as the two order accounting detail cards.
- Fresh-page console errors and warnings: none in both verified states.
- No P0/P1/P2 findings remain.

final result: passed
