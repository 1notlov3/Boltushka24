## 2026-02-16 - Inline Editing Accessibility
**Learning:** Inline editing forms without a visible "Cancel" button rely on undiscoverable keyboard shortcuts (Escape), excluding touch users and confusing mouse users.
**Action:** Always verify inline forms include a visible, accessible "Cancel" action (e.g., `variant="ghost"` button) alongside the primary submit action.
## 2026-02-16 - Non-semantic Profile Interactions
**Learning:** Using `div` or `p` elements with `onClick` handlers for user profile links creates interactive elements that are completely inaccessible to keyboard users and screen readers, as they lack semantic meaning and focusability.
**Action:** Always refactor non-semantic clickable elements into semantic `<button type="button">` tags, providing a descriptive `aria-label` (e.g., "Посмотреть профиль пользователя...") and clear focus styles (e.g., `focus-visible:ring-2`) to ensure full accessibility.
