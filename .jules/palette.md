## 2026-02-16 - Inline Editing Accessibility
**Learning:** Inline editing forms without a visible "Cancel" button rely on undiscoverable keyboard shortcuts (Escape), excluding touch users and confusing mouse users.
**Action:** Always verify inline forms include a visible, accessible "Cancel" action (e.g., `variant="ghost"` button) alongside the primary submit action.

## 2024-03-24 - File Upload Icon-only Button Accessibility
**Learning:** Icon-only remove buttons on file uploads (like 'X' badges) often lack tooltip labels and visible focus states, making them difficult for keyboard users to navigate and for sighted users to discover their meaning.
**Action:** Always wrap icon-only interactive elements in uploaders with a descriptive tooltip (e.g., `ActionTooltip`) and ensure they possess proper `focus-visible` classes.
