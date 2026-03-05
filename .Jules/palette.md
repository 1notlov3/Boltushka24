## 2024-05-23 - Accessibility Patterns
**Learning:** This application uses a wrapper `ActionTooltip` pattern that wraps buttons. The buttons inside often lack `aria-label` or unique accessible names, relying solely on the visual tooltip which is insufficient for screen readers.
**Action:** When using `ActionTooltip`, ensure the child trigger (usually a button) has an explicit `aria-label` matching the tooltip text or function.

## 2024-05-23 - Nested Interactive Elements
**Learning:** `ServerChannel` component nests interactive icons (Edit/Trash) inside a main navigation button. This invalidates HTML and makes inner actions inaccessible to keyboard users.
**Action:** Avoid this pattern. When refactoring, separate the main navigation action from the secondary actions using a non-interactive container (div) or by positioning siblings absolutely if layout requires it.

## 2026-01-29 - Live Status Regions
**Learning:** The `SocketIndicator` was visually indicating status (though incorrectly due to a bug) but lacked semantic announcements. Real-time status changes need `aria-live="polite"` so screen readers announce "Connecting..." or "Online" without user interaction.
**Action:** Add `role="status"` and `aria-live="polite"` to any component that displays real-time connection or system status.

## 2024-05-24 - Contextual Loading States
**Learning:** The generic `Button` component's `isLoading` prop prepends a spinner, which can be redundant when the button already contains a relevant icon (e.g., `RefreshCw`).
**Action:** For buttons with specific action icons, manually animate the icon (e.g., `animate-spin`) instead of using the `isLoading` prop to provide cleaner, context-aware feedback.

## 2024-10-27 - Semantic Variant Usage
**Learning:** Critical destructive actions (Delete Server, Leave Server, etc.) were using `variant="primary"`, making them visually indistinguishable from positive actions. This increases the risk of accidental data loss.
**Action:** Always use `variant="destructive"` (red) for confirmation buttons in modals that perform irreversible or negative actions to provide clear visual cues.

## 2025-03-05 - DropdownMenu Trigger Focus & Destructive Items
**Learning:** The Radix UI `DropdownMenuTrigger` wrapping an `Avatar` lacked focus styling, making keyboard navigation difficult to track. Furthermore, destructive `DropdownMenuItem` elements (like "Log out") lose their semantic warning color (red) when focused by the keyboard because default focus styles override text color.
**Action:** When using `DropdownMenuTrigger` with non-interactive children (like `Avatar`), use `asChild` and wrap the child in a `<button>` with explicit `focus-visible` ring styles. For destructive `DropdownMenuItem`s, explicitly add `focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950` to maintain the warning context during keyboard navigation.
