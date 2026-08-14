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

## Cash card edit and delete verification

- The cash-card pencil now opens a dedicated denomination editor instead of scrolling to the entry form.
- Editing the 10,000 XOF count from 2 to 3 updated the card total from 37,600 XOF to 47,600 XOF.
- The cash-card trash action opens a second confirmation showing the date, total and irreversible-action warning; the QA run cancelled before deletion.
- Screenshots:
  - `/Users/dave/.codex/visualizations/2026/08/14/shoes-cash-edit-qa/cash-edit-modal.png`
  - `/Users/dave/.codex/visualizations/2026/08/14/shoes-cash-edit-qa/cash-delete-confirmation.png`
- Fresh console warnings and errors: none.
