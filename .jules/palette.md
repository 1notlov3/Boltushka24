## 2026-02-16 - Inline Editing Accessibility
**Learning:** Inline editing forms without a visible "Cancel" button rely on undiscoverable keyboard shortcuts (Escape), excluding touch users and confusing mouse users.
**Action:** Always verify inline forms include a visible, accessible "Cancel" action (e.g., `variant="ghost"` button) alongside the primary submit action.
## 2024-04-22 - Semantic Button Refactoring
**Learning:** Using non-semantic elements like div or p for interactive actions (e.g., user profiles) excludes keyboard navigation and screen readers.
**Action:** Always refactor clickable div and p tags into <button type="button"> with focus styles and explicit aria-labels.
