"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[ErrorBoundary]", error?.message, error?.digest, error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-white px-4 text-center text-zinc-900 dark:bg-[#313338] dark:text-zinc-100">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Что-то пошло не так.</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Попробуйте обновить страницу.</p>
        {error?.message && (
          <p className="mt-2 max-w-md break-words rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {error.message}
          </p>
        )}
        {error?.digest && (
          <p className="text-xs text-zinc-400">Digest: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => router.refresh()}>Обновить</Button>
        <Button variant="secondary" onClick={reset}>Повторить</Button>
      </div>
    </div>
  );
}
