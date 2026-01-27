## 2024-05-23 - Accessibility Patterns
**Learning:** This application uses a wrapper `ActionTooltip` pattern that wraps buttons. The buttons inside often lack `aria-label` or unique accessible names, relying solely on the visual tooltip which is insufficient for screen readers.
**Action:** When using `ActionTooltip`, ensure the child trigger (usually a button) has an explicit `aria-label` matching the tooltip text or function.

## 2024-05-23 - Nested Interactive Elements
**Learning:** `ServerChannel` component nests interactive icons (Edit/Trash) inside a main navigation button. This invalidates HTML and makes inner actions inaccessible to keyboard users.
**Action:** Avoid this pattern. When refactoring, separate the main navigation action from the secondary actions using a non-interactive container (div) or by positioning siblings absolutely if layout requires it.

## 2026-01-27 - Misleading State Feedback
**Learning:** `SocketIndicator` displayed "Online" even when disconnected. This actively misleads users about system status.
**Action:** Always verify negative states (error, loading, offline) visually differ from positive states. Use distinct colors (yellow/red) and text labels.
