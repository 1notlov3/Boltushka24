## 2026-02-16 - Inline Editing Accessibility
**Learning:** Inline editing forms without a visible "Cancel" button rely on undiscoverable keyboard shortcuts (Escape), excluding touch users and confusing mouse users.
**Action:** Always verify inline forms include a visible, accessible "Cancel" action (e.g., `variant="ghost"` button) alongside the primary submit action.

## 2026-02-16 - SVG Tooltip Keyboard Accessibility and Role Localization
**Learning:** Raw SVG icons used as tooltip triggers (like role badges) are inaccessible to keyboard users and screen readers. Additionally, displaying raw enum values (like "ADMIN") breaks localization.
**Action:** Always wrap SVG tooltip triggers in a focusable element (`<span tabIndex={0} role="img" aria-label="..." className="focus-visible:ring-2">`) and translate internal enums to the target language (e.g., Russian "Администратор") for accessible labels and tooltip text.
