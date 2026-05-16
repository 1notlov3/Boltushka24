"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";

type SavedChannelRow = {
  id: string;
  message: {
    id: string;
    content: string;
    member: { profile: { name: string } };
  };
};

type SavedDirectRow = {
  id: string;
  directMessage: {
    id: string;
    content: string;
    member: { profile: { name: string } };
  };
};

export const SavedMessagesModal = () => {
  const { isOpen, type, onClose } = useModal();
  const [messages, setMessages] = useState<SavedChannelRow[]>([]);
  const [directMessages, setDirectMessages] = useState<SavedDirectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const isModalOpen = isOpen && type === "savedMessages";

  useEffect(() => {
    if (!isModalOpen) return;

    const load = async () => {
      setLoading(true);
      const response = await fetch("/api/saved-messages");
      if (response.ok) {
        const payload = await response.json() as {
          messages: SavedChannelRow[];
          directMessages: SavedDirectRow[];
        };
        setMessages(payload.messages);
        setDirectMessages(payload.directMessages);
      }
      setLoading(false);
    };

    load();
  }, [isModalOpen]);

  const rows = [
    ...messages.map((row) => ({ id: row.message.id, content: row.message.content, author: row.message.member.profile.name, scope: "Канал" })),
    ...directMessages.map((row) => ({ id: row.directMessage.id, content: row.directMessage.content, author: row.directMessage.member.profile.name, scope: "DM" })),
  ];

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-900 dark:text-zinc-100">
        <DialogHeader>
          <DialogTitle>Избранное</DialogTitle>
        </DialogHeader>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {loading && <p className="text-sm text-zinc-500">Загрузка...</p>}
          {!loading && !rows.length && <p className="text-sm text-zinc-500">Сохранённых сообщений пока нет</p>}
          {rows.map((row) => (
            <div key={`${row.scope}-${row.id}`} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500">{row.scope} · {row.author}</p>
              <p className="line-clamp-3 text-sm">{row.content}</p>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      </DialogContent>
    </Dialog>
  );
};
