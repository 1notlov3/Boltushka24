## 2024-05-23 - Accessibility Patterns
**Learning:** This application uses a wrapper `ActionTooltip` pattern that wraps buttons. The buttons inside often lack `aria-label` or unique accessible names, relying solely on the visual tooltip which is insufficient for screen readers.
**Action:** When using `ActionTooltip`, ensure the child trigger (usually a button) has an explicit `aria-label` matching the tooltip text or function.

## 2025-01-22 - Accessible Hover Actions
**Learning:** The application uses `hidden group-hover:flex` for message actions (Edit/Delete), which completely removes them from the accessibility tree, making them inaccessible to keyboard users even if they are semantic buttons.
**Action:** For accessible hover-reveal actions, prefer using `opacity-0` with `focus-within:opacity-100` (and `pointer-events-none` when hidden) instead of `display: none`, so keyboard users can tab into them.
