"use client";

import { useEffect } from "react";

import { publicFeatures } from "@/lib/public-env";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (publicFeatures.sentryClient) {
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
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Обновить
          </button>
        </main>
      </body>
    </html>
  );
}
