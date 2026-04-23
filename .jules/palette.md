## 2026-02-16 - Inline Editing Accessibility
**Learning:** Inline editing forms without a visible "Cancel" button rely on undiscoverable keyboard shortcuts (Escape), excluding touch users and confusing mouse users.
**Action:** Always verify inline forms include a visible, accessible "Cancel" action (e.g., `variant="ghost"` button) alongside the primary submit action.
## 2026-02-16 - ActionTooltip Trigger Accessibility
**Learning:** The `ActionTooltip` component cannot trigger via keyboard navigation when wrapping raw SVG icons (e.g., role icons), as SVGs are not inherently focusable.
**Action:** Always wrap raw SVG icons inside `ActionTooltip` with a focusable container (e.g., `<span tabIndex={0} role="img" aria-label="...">`) with appropriate focus rings to ensure tooltips are accessible to keyboard users.
