## 2026-02-16 - Inline Editing Accessibility
**Learning:** Inline editing forms without a visible "Cancel" button rely on undiscoverable keyboard shortcuts (Escape), excluding touch users and confusing mouse users.
**Action:** Always verify inline forms include a visible, accessible "Cancel" action (e.g., `variant="ghost"` button) alongside the primary submit action.
## 2026-02-17 - Icon Tooltip Keyboard Accessibility
**Learning:** Icons serving as tooltip triggers (e.g., user role badges in ActionTooltip) are raw SVGs and lack keyboard focusability, making tooltips inaccessible to keyboard-only users.
**Action:** Always wrap SVG tooltip triggers in a focusable container like <span tabIndex={0} role="img" aria-label="..."> to ensure accessibility.
