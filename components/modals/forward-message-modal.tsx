"use client";

import { ChannelType } from "@prisma/client";
import { Hash, Search, Send, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { http } from "@/lib/http";
import { useModal } from "@/hooks/use-modal-store";

type DestinationPayload = {
  channels: Array<{
    id: string;
    name: string;
    type: ChannelType;
    canReceiveForward: boolean;
  }>;
  members: Array<{
    id: string;
    name: string;
    imageUrl: string;
  }>;
};

type ForwardResponse = {
  url: string;
};

export function ForwardMessageModal() {
  const router = useRouter();
  const { isOpen, type, data, onClose } = useModal();
  const [query, setQuery] = useState("");
  const [destinations, setDestinations] = useState<DestinationPayload>({ channels: [], members: [] });
  const [loadingTarget, setLoadingTarget] = useState<string | null>(null);
  const isModalOpen = isOpen && type === "forwardMessage";
  const serverId = data.serverId;
  const message = data.message;

  useEffect(() => {
    if (!isModalOpen || !serverId) {
      setDestinations({ channels: [], members: [] });
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/servers/${serverId}/destinations?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Destinations failed");
        setDestinations(await response.json() as DestinationPayload);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[FORWARD_DESTINATIONS]", error);
          toast.error("Не удалось загрузить получателей");
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isModalOpen, query, serverId]);

  const forward = async (targetType: "channel" | "member", targetId: string) => {
    if (!serverId || !message) return;
    setLoadingTarget(`${targetType}:${targetId}`);

    try {
      const response = await http.post<ForwardResponse>("/api/forward", {
        serverId,
        targetType,
        targetId,
        content: message.content,
        fileUrl: message.fileUrl,
      });
      toast.success("Сообщение переслано");
      onClose();
      router.push(response.data.url);
    } catch (error) {
      console.error("[FORWARD_MESSAGE]", error);
      toast.error("Не удалось переслать сообщение");
    } finally {
      setLoadingTarget(null);
    }
  };

  const preview = message?.content?.trim() || (message?.fileUrl ? "Вложение" : "");
  const textChannels = destinations.channels.filter((channel) => channel.type === ChannelType.TEXT && channel.canReceiveForward);

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-900 dark:text-zinc-100">
        <DialogHeader>
          <DialogTitle>Переслать сообщение</DialogTitle>
        </DialogHeader>

        {preview && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            <p className="line-clamp-3">{preview}</p>
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Канал или участник"
            className="pl-9"
          />
        </div>

        <div className="max-h-[50dvh] space-y-4 overflow-y-auto pr-1">
          {!!textChannels.length && (
            <div className="space-y-1">
              <p className="px-1 text-xs font-semibold uppercase text-zinc-500">Каналы</p>
              {textChannels.map((channel) => {
                const targetKey = `channel:${channel.id}`;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => forward("channel", channel.id)}
                    disabled={loadingTarget !== null}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800"
                  >
                    <Hash className="h-4 w-4 text-zinc-500" />
                    <span className="min-w-0 flex-1 truncate">{channel.name}</span>
                    {loadingTarget === targetKey ? "..." : <Send className="h-4 w-4 text-zinc-400" />}
                  </button>
                );
              })}
            </div>
          )}

          {!!destinations.members.length && (
            <div className="space-y-1">
              <p className="px-1 text-xs font-semibold uppercase text-zinc-500">Участники</p>
              {destinations.members.map((member) => {
                const targetKey = `member:${member.id}`;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => forward("member", member.id)}
                    disabled={loadingTarget !== null}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800"
                  >
                    <UserAvatar src={member.imageUrl} className="h-7 w-7" />
                    <span className="min-w-0 flex-1 truncate">{member.name}</span>
                    {loadingTarget === targetKey ? "..." : <User className="h-4 w-4 text-zinc-400" />}
                  </button>
                );
              })}
            </div>
          )}

          {!textChannels.length && !destinations.members.length && (
            <p className="py-6 text-center text-sm text-zinc-500">Нет доступных получателей</p>
          )}
        </div>

        <Button type="button" variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      </DialogContent>
    </Dialog>
  );
}
