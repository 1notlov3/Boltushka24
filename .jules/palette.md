## 2026-02-16 - Non-semantic Clickable Elements
**Learning:** Using `div` or `p` tags with `onClick` handlers for interactive elements (like user profile links) prevents screen readers from identifying them as actionable and breaks keyboard navigation (tabbing).
**Action:** Always refactor non-semantic clickable elements into semantic `<button>` elements with `type="button"`, appropriate `aria-label`s, and focus styles (`focus-visible:ring-2 focus-visible:ring-zinc-500 focus:outline-none`).
