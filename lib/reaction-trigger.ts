export const REACTION_LONG_PRESS_MS = 500;
export const REACTION_LONG_PRESS_MOVE_TOLERANCE = 12;

export function shouldIgnoreReactionTrigger(target: EventTarget | null) {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest([
      "a",
      "button",
      "input",
      "textarea",
      "select",
      "[role='button']",
      "[data-reaction-ignore]",
    ].join(","))
  );
}

export function movedBeyondReactionTolerance(
  start: { x: number; y: number } | null,
  current: { x: number; y: number },
) {
  if (!start) return false;

  return Math.abs(current.x - start.x) > REACTION_LONG_PRESS_MOVE_TOLERANCE
    || Math.abs(current.y - start.y) > REACTION_LONG_PRESS_MOVE_TOLERANCE;
}
