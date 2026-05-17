"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VoicePlayerProps {
  src: string;
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function VoicePlayer({ src }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    await audio.play();
    setPlaying(true);
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    audio.currentTime = value;
    setCurrentTime(value);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mt-2 flex w-full max-w-sm items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white transition hover:bg-indigo-600"
        aria-label={playing ? "Пауза" : "Воспроизвести голосовое сообщение"}
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Голосовое сообщение</span>
          <span>{formatDuration(currentTime || duration)} / {formatDuration(duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={duration ? currentTime : 0}
          onChange={(event) => seek(Number(event.target.value))}
          className="h-2 w-full accent-indigo-500"
          aria-label="Позиция голосового сообщения"
          style={{ background: `linear-gradient(to right, #6366f1 ${progress}%, #d4d4d8 ${progress}%)` }}
        />
      </div>
    </div>
  );
}
