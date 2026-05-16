"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";

type NotificationItem = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  metadata: { preview?: string; emoji?: string } | null;
  actor: { name: string } | null;
  server: { name: string } | null;
  channel: { name: string } | null;
};

export const NotificationCenterModal = () => {
  const { isOpen, type, onClose } = useModal();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isModalOpen = isOpen && type === "notificationCenter";

  const load = async () => {
    const response = await fetch("/api/notifications");
    if (response.ok) {
      const payload = await response.json() as { items: NotificationItem[]; unreadCount: number };
      setItems(payload.items);
      setUnreadCount(payload.unreadCount);
    }
  };

  useEffect(() => {
    if (isModalOpen) load();
  }, [isModalOpen]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await load();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-900 dark:text-zinc-100">
        <DialogHeader>
          <DialogTitle>Уведомления {unreadCount > 0 ? `(${unreadCount})` : ""}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {!items.length && <p className="text-sm text-zinc-500">Новых уведомлений нет</p>}
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500">
                {item.read ? "Прочитано" : "Новое"} · {item.type}
              </p>
              <p className="text-sm">
                {item.actor?.name ?? "Система"} · {item.server?.name ?? item.channel?.name ?? "Личные сообщения"}
              </p>
              {item.metadata?.preview && <p className="line-clamp-2 text-xs text-zinc-500">{item.metadata.preview}</p>}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Закрыть</Button>
          <Button type="button" variant="primary" onClick={markAllRead}>Прочитать всё</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
