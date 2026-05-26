"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[GlobalError]", error?.message, error?.digest, error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-white px-4 text-center text-zinc-900">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Что-то пошло не так.</h2>
            <p className="text-sm text-zinc-500">Попробуйте обновить страницу.</p>
            {error?.message && (
              <p className="mt-2 max-w-md break-words rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                {error.message}
              </p>
            )}
            {error?.digest && (
              <p className="text-xs text-zinc-400">Digest: {error.digest}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Обновить
            </button>
            <button
              type="button"
              onClick={() => window.location.href = "/"}
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              На главную
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
