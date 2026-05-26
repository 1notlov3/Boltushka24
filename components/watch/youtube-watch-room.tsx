"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Member, Profile } from "@prisma/client";

import { ChatShell } from "@/components/chat/chat-shell";
import { useSocket } from "@/components/providers/socket-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowser } from "@/lib/supabase";
import { canControlWatchSession } from "@/lib/permissions";
import { extractYoutubeId } from "@/lib/youtube";

interface YouTubeWatchRoomProps {
  serverId: string;
  channelId: string;
  channelName: string;
  currentMember: Member & { profile: Profile };
  initialVideoId?: string;
}

type RemoteEvent = {
  action: "load" | "play" | "pause" | "seek" | "sync" | "ended" | "queue" | "queue:delete" | "queue:reorder" | "queue:vote";
  videoId?: string | null;
  time: number;
  isPlaying: boolean;
  updatedByName: string;
};

type QueueItem = {
  id: string;
  videoId: string;
  title: string | null;
  thumbnail: string | null;
  addedById: string;
  addedByName: string;
  position: number;
  voteCount: number;
  votedByMe: boolean;
};

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YouTubeWatchRoom = ({
  serverId,
  channelId,
  channelName,
  currentMember,
  initialVideoId,
}: YouTubeWatchRoomProps) => {
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [videoInput, setVideoInput] = useState(initialVideoId ?? "");
  const [videoId, setVideoId] = useState(initialVideoId ?? "");
  const [status, setStatus] = useState("Ожидание видео");
  const [lastSyncBy, setLastSyncBy] = useState<string>("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [votingItemId, setVotingItemId] = useState<string | null>(null);

  const playerRef = useRef<any>(null);
  const suppressRef = useRef(false);
  const eventKey = useMemo(() => `watch:${channelId}:state`, [channelId]);
  const canControlWatch = canControlWatchSession(currentMember);

  const loadSession = useCallback(async () => {
    const response = await fetch(`/api/watch?serverId=${serverId}&channelId=${channelId}`);
    if (!response.ok) return;

    const payload = await response.json();
    const session = payload?.session;
    if (session?.currentVideoId) {
      setVideoId(session.currentVideoId);
      setVideoInput(session.currentVideoId);
    }
    setQueue(session?.queue ?? []);
  }, [serverId, channelId]);

  const postState = useCallback(
    async (payload: {
      action: "load" | "play" | "pause" | "seek" | "sync" | "ended";
      videoId: string;
      time?: number;
    }) => {
      await fetch("/api/watch", {
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
    if (evt.action.startsWith("queue")) {
      void loadSession();
      return;
    }

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
  }, [loadSession, videoId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const channel = supabase.channel(`presence:watch:${channelId}`, {
      config: { presence: { key: currentMember.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name?: string }>();
        setParticipants(Object.values(state).flat().map((item) => item.name).filter((name): name is string => !!name));
      })
      .subscribe(async (realtimeStatus) => {
        if (realtimeStatus === "SUBSCRIBED") {
          await channel.track({ name: currentMember.profile.name });
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [channelId, currentMember.id, currentMember.profile.name]);

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

            if (!canControlWatch) return;

            if (event.data === window.YT.PlayerState.PLAYING) {
              setStatus("Воспроизведение");
              await postState({ action: "play", videoId, time: currentTime });
            }

            if (event.data === window.YT.PlayerState.PAUSED) {
              setStatus("Пауза");
              await postState({ action: "pause", videoId, time: currentTime });
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              setStatus("Следующее видео");
              await postState({ action: "ended", videoId, time: currentTime });
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
  }, [videoId, postState, canControlWatch]);

  useEffect(() => {
    if (!socket) return;

    socket.on(eventKey, applyRemoteState);

    return () => {
      socket.off(eventKey, applyRemoteState);
    };
  }, [socket, eventKey, applyRemoteState]);

  const startVideo = async () => {
    if (!canControlWatch) {
      setStatus("Только ведущий может загружать видео");
      return;
    }

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
    await loadSession();
  };

  const addToQueue = async () => {
    const parsedId = extractYoutubeId(videoInput);
    if (!parsedId) {
      setStatus("Некорректная YouTube ссылка");
      return;
    }

    await fetch("/api/watch/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverId, channelId, videoId: parsedId }),
    });
    await loadSession();
    setStatus("Добавлено в очередь");
    setVideoInput("");
  };

  const voteQueueItem = async (item: QueueItem) => {
    setVotingItemId(item.id);
    try {
      await fetch(`/api/watch/queue/${item.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId, channelId, voted: !item.votedByMe }),
      });
      await loadSession();
    } finally {
      setVotingItemId(null);
    }
  };

  const deleteQueueItem = async (itemId: string) => {
    await fetch(`/api/watch/queue/${itemId}?serverId=${serverId}&channelId=${channelId}`, {
      method: "DELETE",
    });
    await loadSession();
  };

  const moveQueueItem = async (index: number, direction: -1 | 1) => {
    if (!canControlWatch) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= queue.length) return;

    const next = [...queue];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setQueue(next);

    await fetch("/api/watch/queue/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverId, channelId, itemIds: next.map((item) => item.id) }),
    });
    await loadSession();
  };

  const syncCurrentTime = async () => {
    if (!canControlWatch) {
      setStatus("Только ведущий может синхронизировать просмотр");
      return;
    }
    if (!playerRef.current || !videoId) return;

    const currentTime = Number(playerRef.current.getCurrentTime?.() ?? 0);
    await postState({ action: "seek", videoId, time: currentTime });
    setStatus("Синхронизировано");
  };

  return (
    <div className="flex h-screen flex-col bg-white text-zinc-900 dark:bg-[#313338] dark:text-zinc-100">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Совместный просмотр · #{channelName}</p>
          <p className="text-xs text-zinc-500">
            Статус: {status} · Socket: {isConnected ? "online" : "offline"}
            {lastSyncBy ? ` · Последняя синхра: ${lastSyncBy}` : ""}
          </p>
          <p className="mt-1 text-xs text-indigo-500">
            {canControlWatch ? "Вы ведущий: можно управлять видео и очередью" : "Гость: можно добавлять видео в очередь, управление у модераторов"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Назад в чат
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800 md:flex-row">
        <Input
          value={videoInput}
          onChange={(event) => setVideoInput(event.target.value)}
          placeholder="YouTube ссылка или video ID"
          className="bg-zinc-100 dark:bg-zinc-900"
        />
        <Button onClick={startVideo} disabled={!canControlWatch}>Загрузить видео</Button>
        <Button variant="secondary" onClick={addToQueue}>В очередь</Button>
        <Button variant="secondary" onClick={syncCurrentTime} disabled={!canControlWatch}>Синхронизировать текущее время</Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-[400px] p-4">
          <div className="h-full min-h-[400px] w-full overflow-hidden rounded-md bg-black">
            <div id="youtube-player" className="h-full w-full" />
          </div>
        </div>

        <aside className="flex min-h-0 flex-col border-t border-zinc-200 dark:border-zinc-800 lg:border-l lg:border-t-0">
          <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Очередь · голосование</p>
              <p className="text-xs text-zinc-500">{participants.length} онлайн</p>
            </div>
            <p className="mb-2 text-[11px] text-zinc-500">Голосуй за следующее видео. Больше голосов — выше в очереди.</p>
            <div className="flex -space-x-2 pb-2">
              {participants.slice(0, 8).map((name) => (
                <span
                  key={name}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-[10px] font-semibold text-white dark:border-[#313338]"
                  title={name}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {queue.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500 dark:border-zinc-700">
                  Очередь пустая. Добавь YouTube ссылку выше — участники смогут голосовать.
                </div>
              ) : null}
              {queue.map((item, index) => {
                const isCurrentVideo = !!videoId && item.videoId === videoId;
                const isNextUp = !isCurrentVideo && index === queue.findIndex((queueItem) => queueItem.videoId !== videoId);

                return (
                  <div
                    key={item.id}
                    className={`flex gap-2 rounded-md border bg-zinc-100 p-2 dark:bg-zinc-800 ${isNextUp ? "border-indigo-500" : "border-transparent"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail ?? `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`}
                      alt=""
                      className="h-12 w-20 rounded-sm object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isNextUp ? "bg-indigo-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}>
                          {isCurrentVideo ? "Сейчас играет" : isNextUp ? "Следующее" : `#${index + 1}`}
                        </span>
                      </div>
                      <p className="truncate text-xs font-semibold">{item.title || item.videoId}</p>
                      <p className="truncate text-[11px] text-zinc-500">Добавил: {item.addedByName}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={votingItemId === item.id}
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold transition ${item.votedByMe ? "bg-indigo-500 text-white" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200"}`}
                          onClick={() => voteQueueItem(item)}
                        >
                          👍 {item.voteCount}
                        </button>
                        <span className="text-[11px] text-zinc-500">{item.voteCount === 0 ? "Пока без голосов" : `${item.voteCount} голос(ов)`}</span>
                        {canControlWatch ? (
                          <>
                            <button type="button" className="text-[11px] text-zinc-500" onClick={() => moveQueueItem(index, -1)}>Выше</button>
                            <button type="button" className="text-[11px] text-zinc-500" onClick={() => moveQueueItem(index, 1)}>Ниже</button>
                          </>
                        ) : null}
                        {(canControlWatch || item.addedById === currentMember.profileId) ? (
                          <button type="button" className="text-[11px] text-rose-500" onClick={() => deleteQueueItem(item.id)}>Убрать</button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ChatShell
              member={currentMember}
              name={channelName}
              chatId={channelId}
              type="channel"
              apiUrl="/api/messages"
              socketUrl="/api/messages"
              socketQuery={{ serverId, channelId }}
              paramKey="channelId"
              paramValue={channelId}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};
