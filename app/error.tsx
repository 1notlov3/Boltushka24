"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { publicFeatures } from "@/lib/public-env";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    if (publicFeatures.sentryClient) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-white px-4 text-center text-zinc-900 dark:bg-[#313338] dark:text-zinc-100">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Что-то пошло не так.</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Попробуйте обновить страницу.</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => router.refresh()}>Обновить</Button>
        <Button variant="secondary" onClick={reset}>Повторить</Button>
      </div>
    </div>
  );
}
