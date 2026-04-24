## 2026-02-16 - Inline Editing Accessibility
**Learning:** Inline editing forms without a visible "Cancel" button rely on undiscoverable keyboard shortcuts (Escape), excluding touch users and confusing mouse users.
**Action:** Always verify inline forms include a visible, accessible "Cancel" action (e.g., `variant="ghost"` button) alongside the primary submit action.

## 2024-05-24 - Semantic Clickable Elements
**Learning:** Using non-semantic elements like div or p with onClick handlers for interactive actions breaks keyboard navigation and hides the interaction from screen readers.
**Action:** Always refactor clickable div and p tags into semantic <button type="button"> elements, and include context-aware aria-labels (e.g., incorporating the user's name).
