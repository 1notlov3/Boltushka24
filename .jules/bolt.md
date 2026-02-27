## 2026-06-25 - [Chat Item Event Listener Optimization]
**Learning:** The `ChatItem` component was attaching a global `keydown` event listener to `window` for every rendered message, regardless of whether it was being edited. This caused N listeners (where N is the number of messages) to fire on every keypress.
**Action:** Refactored the `useEffect` hook in `components/chat/chat-item.tsx` to conditionally attach the `keydown` listener only when `isEditing` is true. This ensures zero listeners are active for non-editing users and only one listener is active when editing a message.
