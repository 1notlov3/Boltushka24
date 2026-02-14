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

## 2026-05-23 - Inline Editing Controls
**Learning:** Inline editing forms (e.g., in `ChatItem`) relied solely on keyboard shortcuts (Esc) to cancel, which is inaccessible to touch users and non-obvious to keyboard users.
**Action:** Always include a visible 'Cancel' button (`variant="ghost"`, `type="button"`) alongside the submit button in inline forms.
