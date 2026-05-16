"use client";

import { useEffect, useState } from "react";
import qs from "query-string";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";

type SearchItem = {
  id: string;
  content: string;
  createdAt: string;
  member: {
    profile: {
      name: string;
    };
  };
};

export const MessageSearchModal = () => {
  const { isOpen, type, data, onClose } = useModal();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isModalOpen = isOpen && type === "messageSearch";

  useEffect(() => {
    if (!isModalOpen || !data.chatId || query.trim().length < 2) {
      setItems([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const url = qs.stringifyUrl({
          url: data.chatType === "conversation" ? "/api/direct-messages/search" : "/api/messages/search",
          query: data.chatType === "conversation"
            ? { conversationId: data.chatId, q: query }
            : { channelId: data.chatId, q: query },
        });
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Не удалось выполнить поиск");
        const payload = await response.json() as { items: SearchItem[] };
        setItems(payload.items);
      } catch (searchError) {
        if (!controller.signal.aborted) {
          setError(searchError instanceof Error ? searchError.message : "Ошибка поиска");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [data.chatId, data.chatType, isModalOpen, query]);

  const jumpToMessage = (id: string) => {
    document.getElementById(`message-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-900 dark:text-zinc-100">
        <DialogHeader>
          <DialogTitle>Поиск сообщений</DialogTitle>
        </DialogHeader>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Введите минимум 2 символа"
          className="bg-zinc-100 dark:bg-zinc-800"
        />
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {loading && <p className="text-sm text-zinc-500">Поиск...</p>}
          {error && <p className="text-sm text-rose-500">{error}</p>}
          {!loading && query.trim().length >= 2 && !items.length && !error && (
            <p className="text-sm text-zinc-500">Ничего не найдено</p>
          )}
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
