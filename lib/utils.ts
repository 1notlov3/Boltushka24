import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastExecTime = 0;
  let lastArgs: any[] | null = null;
  let lastContext: any = null;

  const execute = () => {
    if (lastArgs) {
      func.apply(lastContext, lastArgs);
      lastExecTime = Date.now();
      lastArgs = null;
      lastContext = null;
    }
    timeoutId = null;
  };

  const throttledFunction = function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    lastArgs = args;
    lastContext = this;

    if (!lastExecTime || (now - lastExecTime >= delay)) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      execute();
    } else if (!timeoutId) {
      timeoutId = setTimeout(execute, delay - (now - lastExecTime));
    }
  };

  (throttledFunction as any).cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    lastContext = null;
  };

  return throttledFunction as unknown as ((...args: Parameters<T>) => void) & { cancel: () => void };
}
