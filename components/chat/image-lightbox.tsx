"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef } from "react";

interface ImageLightboxProps {
  images: string[];
  activeUrl: string | null;
  onClose: () => void;
  onChange: (url: string) => void;
}

export function ImageLightbox({ images, activeUrl, onClose, onChange }: ImageLightboxProps) {
  const touchStartRef = useRef<number | null>(null);
  const activeIndex = useMemo(() => images.findIndex((image) => image === activeUrl), [activeUrl, images]);
  const canNavigate = images.length > 1 && activeIndex >= 0;

  const goTo = useCallback((direction: -1 | 1) => {
    if (!canNavigate) return;

    const nextIndex = (activeIndex + direction + images.length) % images.length;
    onChange(images[nextIndex]);
  }, [activeIndex, canNavigate, images, onChange]);

  useEffect(() => {
    if (!activeUrl) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goTo(-1);
      if (event.key === "ArrowRight") goTo(1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeUrl, goTo, onClose]);

  if (!activeUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3"
      role="dialog"
      aria-modal="true"
      onTouchStart={(event) => {
        touchStartRef.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (start === null) return;

        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) < 50) return;
        goTo(delta > 0 ? -1 : 1);
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Закрыть просмотр изображения"
      >
        <X className="h-6 w-6" />
      </button>

      {canNavigate && (
        <>
          <button
            type="button"
            onClick={() => goTo(-1)}
            className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20 sm:inline-flex"
            aria-label="Предыдущее изображение"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={() => goTo(1)}
            className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20 sm:inline-flex"
            aria-label="Следующее изображение"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}

      <div className="relative h-[85dvh] w-full max-w-6xl">
        <Image
          src={activeUrl}
          alt="Изображение"
          fill
          sizes="100vw"
          className="object-contain"
          priority
        />
      </div>

      {canNavigate && (
        <div className="absolute bottom-4 rounded-md bg-white/10 px-3 py-1 text-sm text-white">
          {activeIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
