"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, MessageSquare, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

type SavedChannelRow = {
  id: string;
  message: {
    id: string;
    content: string;
    channelId: string;
    channel?: { id: string; name: string; serverId: string } | null;
    member: { profile: { name: string } };
  };
};

type ConversationMember = {
  id: string;
  profile: { name: string; imageUrl: string };
};

type SavedDirectRow = {
  id: string;
  member: { id: string; serverId: string };
  directMessage: {
    id: string;
    content: string;
    conversationId: string;
    member: { profile: { name: string } };
    conversation?: {
      id: string;
      memberOneId: string;
      memberTwoId: string;
      memberOne: ConversationMember;
      memberTwo: ConversationMember;
    } | null;
  };
};

type SavedRow = {
  key: string;
  id: string;
  content: string;
  author: string;
  scope: "Канал" | "DM";
  subtitle: string;
  href: string | null;
};

const copyToClipboard = async (value: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    toast.success("Сообщение скопировано");
  } catch {
    toast.error("Не удалось скопировать");
  }
};

export const SavedMessagesModal = () => {
  const router = useRouter();
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

    void load();
  }, [isModalOpen]);

  const rows: SavedRow[] = [
    ...messages.map((row) => ({
      key: `channel-${row.id}`,
      id: row.message.id,
      content: row.message.content,
      author: row.message.member.profile.name,
      scope: "Канал" as const,
      subtitle: row.message.channel ? `#${row.message.channel.name}` : "Канал",
      href: row.message.channel
        ? `/servers/${row.message.channel.serverId}/channels/${row.message.channelId}#message-${row.message.id}`
        : null,
    })),
    ...directMessages.map((row) => {
      const conversation = row.directMessage.conversation;
      const otherMember = conversation
        ? (conversation.memberOneId === row.member.id ? conversation.memberTwo : conversation.memberOne)
        : null;

      return {
        key: `direct-${row.id}`,
        id: row.directMessage.id,
        content: row.directMessage.content,
        author: row.directMessage.member.profile.name,
        scope: "DM" as const,
        subtitle: otherMember ? `Личка с ${otherMember.profile.name}` : "Личное сообщение",
        href: otherMember
          ? `/servers/${row.member.serverId}/conversations/${otherMember.id}#message-${row.directMessage.id}`
          : null,
      };
    }),
  ];

  const openRow = (row: SavedRow) => {
    if (!row.href) return;
    onClose();
    router.push(row.href);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-900 dark:text-zinc-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Избранное</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
          {loading && <p className="text-sm text-zinc-500">Загрузка...</p>}
          {!loading && !rows.length && (
            <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
              <BookmarkIcon />
              <p className="mt-2 text-sm font-medium">Сохранённых сообщений пока нет</p>
              <p className="mt-1 text-xs text-zinc-500">Нажми закладку у сообщения, чтобы быстро вернуться к нему позже.</p>
            </div>
          )}
          {rows.map((row) => (
            <div
              key={row.key}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  row.scope === "Канал" ? "bg-indigo-500/10 text-indigo-600" : "bg-emerald-500/10 text-emerald-600"
                )}>
                  {row.scope === "Канал" ? <MessageSquare className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                </div>
                <button
                  type="button"
                  onClick={() => openRow(row)}
                  disabled={!row.href}
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                >
                  <p className="text-xs font-semibold text-zinc-500">{row.scope} · {row.subtitle} · {row.author}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">{row.content}</p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(row.content)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Копировать сообщение"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {row.href && (
                    <button
                      type="button"
                      onClick={() => openRow(row)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      aria-label="Перейти к сообщению"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
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

const BookmarkIcon = () => (
  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
    <MessageSquare className="h-5 w-5" />
  </div>
);
