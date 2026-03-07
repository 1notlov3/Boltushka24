import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = { leading: true, trailing: true }
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastRan = 0;
  let lastArgs: Parameters<T> | null = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const { leading, trailing } = options;

    if (!lastRan && !leading) {
      lastRan = now;
    }

    const timeSinceLastRan = now - lastRan;

    if (timeSinceLastRan >= limit) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      func.apply(this, args);
      lastRan = now;
    } else if (trailing) {
      lastArgs = args;
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          if (lastArgs) {
            func.apply(this, lastArgs);
            lastRan = leading ? Date.now() : 0;
            lastArgs = null;
          }
          timeoutId = null;
        }, limit - timeSinceLastRan);
      }
    }
  };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastRan = 0;
    lastArgs = null;
  };

  return throttled;
}
