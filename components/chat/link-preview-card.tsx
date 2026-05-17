"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type LinkPreviewPayload = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
};

interface LinkPreviewCardProps {
  url: string;
}

export function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreviewPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ url });

    setLoading(true);

    void fetch(`/api/link-preview?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Preview fetch failed");
        return response.json() as Promise<LinkPreviewPayload>;
      })
      .then((payload) => {
        setPreview(payload);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("[LINK_PREVIEW_CARD]", error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [url]);

  if (loading && !preview) {
    return (
      <div className="mt-2 flex max-w-xl items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка превью
      </div>
    );
  }

  if (!preview || (!preview.title && !preview.description && !preview.image)) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex max-w-xl overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
    >
      {preview.image && (
        <span className="relative block h-24 w-28 shrink-0 overflow-hidden bg-zinc-200 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <ExternalLink className="h-3.5 w-3.5" />
          {new URL(preview.url).hostname}
        </span>
        {preview.title && (
          <span className="line-clamp-2 font-semibold text-zinc-900 dark:text-zinc-100">{preview.title}</span>
        )}
        {preview.description && (
          <span className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">{preview.description}</span>
        )}
      </span>
    </a>
  );
}
