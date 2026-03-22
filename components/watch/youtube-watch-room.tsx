"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useSocket } from "@/components/providers/socket-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface YouTubeWatchRoomProps {
  serverId: string;
  channelId: string;
  channelName: string;
  initialVideoId?: string;
}

type RemoteEvent = {
  action: "load" | "play" | "pause" | "seek" | "sync";
  videoId: string;
  time: number;
  isPlaying: boolean;
  updatedByName: string;
};

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// ⚡ Bolt Optimization: Define regular expressions as module-level constants
// to prevent redundant object creation and recompilation on every extractYoutubeId invocation.
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
];

const extractYoutubeId = (url: string): string | null => {
  const trimmed = url.trim();

  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
};

export const YouTubeWatchRoom = ({
  serverId,
  channelId,
  channelName,
  initialVideoId,
}: YouTubeWatchRoomProps) => {
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [videoInput, setVideoInput] = useState(initialVideoId ?? "");
  const [videoId, setVideoId] = useState(initialVideoId ?? "");
  const [status, setStatus] = useState("Ожидание видео");
  const [lastSyncBy, setLastSyncBy] = useState<string>("");

  const playerRef = useRef<any>(null);
  const suppressRef = useRef(false);
  const eventKey = useMemo(() => `watch:${channelId}:state`, [channelId]);

  const postState = useCallback(
    async (payload: {
      action: "load" | "play" | "pause" | "seek" | "sync";
      videoId: string;
      time?: number;
    }) => {
      await fetch("/api/socket/watch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverId,
          channelId,
          ...payload,
        }),
      });
    },
    [serverId, channelId],
  );

  const applyRemoteState = useCallback((evt: RemoteEvent) => {
    if (!playerRef.current || !window.YT) return;

    suppressRef.current = true;
    setLastSyncBy(evt.updatedByName || "участник");

    if (evt.videoId && evt.videoId !== videoId) {
      setVideoId(evt.videoId);
      setVideoInput(evt.videoId);
      playerRef.current.loadVideoById(evt.videoId, evt.time || 0);
    } else if (typeof evt.time === "number") {
      playerRef.current.seekTo(evt.time, true);
    }

    if (evt.action === "play") {
      playerRef.current.playVideo();
      setStatus("Воспроизведение");
    }

    if (evt.action === "pause") {
      playerRef.current.pauseVideo();
      setStatus("Пауза");
    }

    if (evt.action === "load") {
      setStatus("Видео загружено");
    }

    setTimeout(() => {
      suppressRef.current = false;
    }, 700);
  }, [videoId]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/socket/watch?serverId=${serverId}&channelId=${channelId}`);
      if (!response.ok) return;

      const payload = await response.json();
      const state = payload?.state;
      if (state?.videoId) {
        setVideoId(state.videoId);
        setVideoInput(state.videoId);
      }
    };

    load();
  }, [serverId, channelId]);

  useEffect(() => {
    if (window.YT?.Player) return;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!videoId) return;

    const setupPlayer = () => {
      if (!window.YT?.Player) return;
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
      }

      playerRef.current = new window.YT.Player("youtube-player", {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onStateChange: async (event: any) => {
            if (suppressRef.current) return;
            if (!playerRef.current) return;

            const currentTime = Number(playerRef.current.getCurrentTime?.() ?? 0);

            if (event.data === window.YT.PlayerState.PLAYING) {
              setStatus("Воспроизведение");
              await postState({ action: "play", videoId, time: currentTime });
            }

            if (event.data === window.YT.PlayerState.PAUSED) {
              setStatus("Пауза");
              await postState({ action: "pause", videoId, time: currentTime });
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      setupPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = setupPlayer;

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, [videoId, postState]);

  useEffect(() => {
    if (!socket) return;

    socket.on(eventKey, applyRemoteState);

    return () => {
      socket.off(eventKey, applyRemoteState);
    };
  }, [socket, eventKey, applyRemoteState]);

  const startVideo = async () => {
    const parsedId = extractYoutubeId(videoInput);
    if (!parsedId) {
      setStatus("Некорректная YouTube ссылка");
      return;
    }

    setVideoId(parsedId);
    setStatus("Загрузка видео...");

    await postState({
      action: "load",
      videoId: parsedId,
      time: 0,
    });
  };

  const syncCurrentTime = async () => {
    if (!playerRef.current || !videoId) return;

    const currentTime = Number(playerRef.current.getCurrentTime?.() ?? 0);
    await postState({ action: "seek", videoId, time: currentTime });
    setStatus("Синхронизировано");
  };

  return (
    <div className="h-screen bg-white dark:bg-[#313338] text-zinc-900 dark:text-zinc-100 flex flex-col">
      <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Совместный просмотр · #{channelName}</p>
          <p className="text-xs text-zinc-500">
            Статус: {status} · Socket: {isConnected ? "online" : "offline"}
            {lastSyncBy ? ` · Последняя синхра: ${lastSyncBy}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Назад в чат
          </Button>
        </div>
      </div>

      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-2">
        <Input
          value={videoInput}
          onChange={(e) => setVideoInput(e.target.value)}
          placeholder="YouTube ссылка или video ID"
          className="bg-zinc-100 dark:bg-zinc-900"
        />
        <Button onClick={startVideo}>Загрузить видео</Button>
        <Button variant="secondary" onClick={syncCurrentTime}>Синхронизировать текущее время</Button>
      </div>

      <div className="flex-1 p-4">
        <div className="w-full h-full min-h-[400px] rounded-md overflow-hidden bg-black">
          <div id="youtube-player" className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};
