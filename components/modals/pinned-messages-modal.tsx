"use client";

import { useEffect, useState } from "react";
import qs from "query-string";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";

type PinnedItem = {
  id: string;
  content: string;
  pinnedAt: string | null;
  member: {
    profile: {
      name: string;
    };
  };
};

export const PinnedMessagesModal = () => {
  const { isOpen, type, data, onClose } = useModal();
  const [items, setItems] = useState<PinnedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isModalOpen = isOpen && type === "pinnedMessages";

  useEffect(() => {
    if (!isModalOpen || !data.chatId) return;

    const load = async () => {
      setLoading(true);
      const url = qs.stringifyUrl({
        url: data.chatType === "conversation" ? "/api/direct-messages/pinned" : "/api/messages/pinned",
        query: data.chatType === "conversation"
          ? { conversationId: data.chatId }
          : { channelId: data.chatId },
      });
      const response = await fetch(url);
      if (response.ok) {
        const payload = await response.json() as { items: PinnedItem[] };
        setItems(payload.items);
      }
      setLoading(false);
    };

    load();
  }, [data.chatId, data.chatType, isModalOpen]);

  const jumpToMessage = (id: string) => {
    const hash = `message-${id}`;
    if (window.location.hash !== `#${hash}`) {
      window.history.replaceState(null, "", `#${hash}`);
    }
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    document.getElementById(`message-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-900 dark:text-zinc-100">
        <DialogHeader>
          <DialogTitle>Закреплённые сообщения</DialogTitle>
        </DialogHeader>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {loading && <p className="text-sm text-zinc-500">Загрузка...</p>}
          {!loading && !items.length && <p className="text-sm text-zinc-500">Закреплённых сообщений пока нет</p>}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => jumpToMessage(item.id)}
              className="block w-full rounded-md border border-zinc-200 p-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <p className="text-xs font-semibold text-zinc-500">{item.member.profile.name}</p>
              <p className="line-clamp-2 text-sm">{item.content}</p>
            </button>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      </DialogContent>
    </Dialog>
  );
};
