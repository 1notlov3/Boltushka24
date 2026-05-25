"use client";

import * as z from "zod";
import { http } from "@/lib/http";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Member, MemberRole, Profile } from "@prisma/client";
import { Bookmark, Copy, Edit, FileIcon, Forward, Link, MoreHorizontal, Pin, Reply, ShieldAlert, ShieldCheck, SmilePlus, Trash } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, memo } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/use-modal-store";
import { useRouter, useParams } from "next/navigation";
import type { ReplyTarget } from "@/components/chat/chat-shell";
import { MessageContent } from "@/components/chat/message-content";
import { PollBlock, type PollData } from "@/components/chat/poll-block";
import { VoicePlayer } from "@/components/chat/voice-player";
import { fileExtensionFromUrl, isAudioUrl, isImageUrl } from "@/lib/upload";
import {
  movedBeyondReactionTolerance,
  REACTION_LONG_PRESS_MS,
  shouldIgnoreReactionTrigger,
} from "@/lib/reaction-trigger";

type Reaction = {
  id: string;
  emoji: string;
  memberId: string;
};

type ParentPreview = {
  id: string;
  content: string;
  deleted: boolean;
  member: Member & { profile: Profile };
};

type ChatCacheMessage = {
  id: string;
  content?: string;
  reactions?: Reaction[];
  savedBy?: { id: string }[];
  pinned?: boolean;
  [key: string]: unknown;
};

type ChatCachePage = {
  items: ChatCacheMessage[];
};

type ChatCacheData = {
  pages: ChatCachePage[];
  pageParams?: unknown[];
};

interface ChatItemProps {
  id: string;
  content: string;
  member: Member & {
    profile: Profile;
  };
  timestamp: string;
  fileUrl: string | null;
  deleted: boolean;
  currentMember: Member;
  isUpdated: boolean;
  socketUrl: string;
  socketQuery: Record<string, string>;
  queryKey: string;
  chatType: "channel" | "conversation";
  reactions: Reaction[];
  savedByCurrentMember: boolean;
  pinned: boolean;
  parent: ParentPreview | null;
  poll?: PollData | null;
  outbox?: boolean;
  repliesCount?: number;
  mentionNames?: Record<string, string>;
  highlighted?: boolean;
  onReply: (target: ReplyTarget) => void;
  onOpenThread?: (messageId: string) => void;
  onOpenImage?: (url: string) => void;
};

const roleIconMap = {
  "GUEST": null,
  "MODERATOR": <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />,
  "ADMIN": <ShieldAlert className="h-4 w-4 ml-2 text-rose-500" />,
}

const formSchema = z.object({
  content: z.string().min(1),
});

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥"];

export const ChatItem = memo(({
  id,
  content,
  member,
  timestamp,
  fileUrl,
  deleted,
  currentMember,
  isUpdated,
  socketUrl,
  socketQuery,
  queryKey,
  chatType,
  reactions,
  savedByCurrentMember,
  pinned,
  parent,
  poll,
  outbox,
  repliesCount = 0,
  mentionNames,
  highlighted = false,
  onReply,
  onOpenThread,
  onOpenImage,
}: ChatItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchAtRef = useRef(0);
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const onMemberClick = () => {
    if (member.id === currentMember.id) {
      return;
    }

    router.push(`/servers/${params?.serverId}/conversations/${member.id}`);
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: content
    }
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: `${socketUrl}/${id}`,
        query: socketQuery,
      });

      const { data } = await http.patch<ChatCacheMessage>(url, values);

      updateCachedMessage(() => data);
      form.reset({
        content: typeof data.content === "string" ? data.content : values.content,
      });
      setIsEditing(false);
    } catch (error) {
      console.log(error);
    }
  }

  const fileType = fileUrl ? fileExtensionFromUrl(fileUrl) : "";

  const isAdmin = currentMember.role === MemberRole.ADMIN;
  const isModerator = currentMember.role === MemberRole.MODERATOR;
  const isOwner = currentMember.id === member.id;
  const canDeleteMessage = !deleted && (isAdmin || isModerator || isOwner);
  const canEditMessage = !deleted && isOwner && !fileUrl;
  const canPinMessage = !deleted && (isAdmin || isModerator || isOwner);
  const isPDF = fileType === "pdf" && fileUrl;
  const isAudio = !!fileUrl && isAudioUrl(fileUrl);
  const isImage = !!fileUrl && isImageUrl(fileUrl);
  const actionBase = chatType === "conversation"
    ? `/api/direct-messages/${id}`
    : `/api/messages/${id}`;

  const updateCachedMessage = (updater: (message: ChatCacheMessage) => ChatCacheMessage) => {
    queryClient.setQueryData<ChatCacheData>([queryKey], (old) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => item.id === id ? updater(item) : item),
        })),
      };
    });
  };

  const onReaction = async (emoji: string) => {
    updateCachedMessage((message) => {
      const currentReactions = message.reactions ?? reactions;
      const existing = currentReactions.find((reaction) =>
        reaction.emoji === emoji && reaction.memberId === currentMember.id
      );

      return {
        ...message,
        reactions: existing
          ? currentReactions.filter((reaction) => reaction.id !== existing.id)
          : [
              ...currentReactions,
              { id: `${currentMember.id}-${emoji}`, emoji, memberId: currentMember.id },
            ],
      };
    });

    try {
      const { data } = await http.post<ChatCacheMessage>(`${actionBase}/reactions`, { emoji });
      updateCachedMessage(() => data);
    } catch (error) {
      console.log(error);
      updateCachedMessage((message) => ({
        ...message,
        reactions,
      }));
    }
  };

  const onPin = async () => {
    updateCachedMessage((message) => ({ ...message, pinned: !pinned }));

    try {
      const { data } = await http.patch<ChatCacheMessage>(`${actionBase}/pin`, { pinned: !pinned });
      updateCachedMessage(() => data);
    } catch (error) {
      console.log(error);
      updateCachedMessage((message) => ({ ...message, pinned }));
    }
  };

  const onSave = async () => {
    updateCachedMessage((message) => ({
      ...message,
      savedBy: savedByCurrentMember ? [] : [{ id: `optimistic-save-${Date.now()}` }],
    }));

    try {
      const { data } = await http.post<{ saved: boolean }>(`${actionBase}/save`);
      updateCachedMessage((message) => ({
        ...message,
        savedBy: data.saved ? [{ id: `optimistic-save-${currentMember.id}` }] : [],
      }));
    } catch (error) {
      console.log(error);
      updateCachedMessage((message) => ({
        ...message,
        savedBy: savedByCurrentMember ? [{ id: `optimistic-save-${currentMember.id}` }] : [],
      }));
    }
  };

  const reactionGroups = reactions.reduce<Record<string, Reaction[]>>((acc, reaction) => {
    acc[reaction.emoji] = [...(acc[reaction.emoji] ?? []), reaction];
    return acc;
  }, {});
  const reactionEntries = Object.entries(reactionGroups);

  const scrollToParent = () => {
    if (!parent) return;
    document.getElementById(`message-${parent.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const copyToClipboard = async (value: string, successMessage: string) => {
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
      toast.success(successMessage);
    } catch (error) {
      console.error("[COPY_MESSAGE]", error);
      toast.error("Не удалось скопировать");
    }
  };

  const copyMessageText = () => {
    const value = content.trim() || fileUrl || "";
    if (!value) return;
    void copyToClipboard(value, "Сообщение скопировано");
  };

  const copyMessageLink = () => {
    const url = new URL(window.location.href);
    url.hash = `message-${id}`;
    void copyToClipboard(url.toString(), "Ссылка на сообщение скопирована");
  };

  const replyToMessage = () => onReply({ id, content, authorName: member.profile.name });

  const openForwardModal = () => onOpen("forwardMessage", {
    serverId: typeof params?.serverId === "string" ? params.serverId : socketQuery.serverId,
    message: { id, content, fileUrl },
  });

  const openDeleteModal = () => onOpen("deleteMessage", {
    apiUrl: `${socketUrl}/${id}`,
    query: socketQuery,
  });

  const startEditing = () => {
    form.reset({ content });
    setIsEditing(true);
  };

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openReactionPicker = () => {
    if (!deleted) {
      setIsReactionPickerOpen(true);
    }
  };

  const chooseReaction = (emoji: string) => {
    setIsReactionPickerOpen(false);
    void onReaction(emoji);
  };

  const handleMessageClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (deleted || shouldIgnoreReactionTrigger(event.target)) return;

    const justTouched = Date.now() - lastTouchAtRef.current < 700;
    if (justTouched) return;

    openReactionPicker();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (deleted || shouldIgnoreReactionTrigger(event.target)) return;

    if (event.pointerType !== "touch") return;

    lastTouchAtRef.current = Date.now();
    touchStartRef.current = { x: event.clientX, y: event.clientY };
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      openReactionPicker();
      longPressTimerRef.current = null;
    }, REACTION_LONG_PRESS_MS);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;

    if (movedBeyondReactionTolerance(touchStartRef.current, { x: event.clientX, y: event.clientY })) {
      clearLongPressTimer();
    }
  };

  const handlePointerEnd = () => {
    clearLongPressTimer();
    touchStartRef.current = null;
  };

  useEffect(() => {
    if (!isReactionPickerOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest(`[data-message-id="${id}"]`)) return;
      setIsReactionPickerOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReactionPickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [id, isReactionPickerOpen]);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  return (
    <div
      id={`message-${id}`}
      data-message-id={id}
      onClick={handleMessageClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onContextMenu={(event) => {
        if (Date.now() - lastTouchAtRef.current < 900) {
          event.preventDefault();
        }
      }}
      className={cn(
        "relative group flex items-center px-4 py-2.5 sm:py-2 transition w-full hover:bg-black/5",
        highlighted && "bg-indigo-500/10 ring-1 ring-inset ring-indigo-400/40"
      )}
    >
      <div className="group flex gap-x-3 sm:gap-x-2 items-start w-full">
      <div data-reaction-ignore onClick={onMemberClick} className="cursor-pointer hover:drop-shadow-md transition shrink-0">
          <UserAvatar src={member.profile.imageUrl} />
        </div>
        <div className="flex flex-col w-full min-w-0">
          <div className="flex items-center gap-x-2 flex-wrap">
            <div className="flex items-center">
            <p data-reaction-ignore onClick={onMemberClick} className="font-semibold text-sm sm:text-sm hover:underline cursor-pointer">
                {member.profile.name}
              </p>
              {roleIconMap[member.role] && (
                <ActionTooltip label={member.role}>
                  {roleIconMap[member.role]}
                </ActionTooltip>
              )}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {timestamp}
            </span>
            {pinned && !deleted && (
              <span className="inline-flex items-center gap-1 rounded-sm bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                <Pin className="h-3 w-3" />
                закреплено
              </span>
            )}
            {outbox && !deleted && (
              <span className="inline-flex items-center rounded-sm bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-300">
                В очереди
              </span>
            )}
            {!deleted && (
              <div data-reaction-ignore className="ml-auto sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      aria-label="Действия с сообщением"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={copyMessageText}>
                      <Copy className="mr-2 h-4 w-4" />
                      Копировать текст
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={copyMessageLink}>
                      <Link className="mr-2 h-4 w-4" />
                      Ссылка на сообщение
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={replyToMessage}>
                      <Reply className="mr-2 h-4 w-4" />
                      Ответить
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={openReactionPicker}>
                      <SmilePlus className="mr-2 h-4 w-4" />
                      Реакция
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {canPinMessage && (
                      <DropdownMenuItem onSelect={onPin}>
                        <Pin className="mr-2 h-4 w-4" />
                        {pinned ? "Открепить" : "Закрепить"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={openForwardModal}>
                      <Forward className="mr-2 h-4 w-4" />
                      Переслать
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onSave}>
                      <Bookmark className="mr-2 h-4 w-4" />
                      {savedByCurrentMember ? "Убрать из избранного" : "Сохранить"}
                    </DropdownMenuItem>
                    {canEditMessage && (
                      <DropdownMenuItem onSelect={startEditing}>
                        <Edit className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                    )}
                    {canDeleteMessage && (
                      <DropdownMenuItem onSelect={openDeleteModal} className="text-rose-600 focus:text-rose-600">
                        <Trash className="mr-2 h-4 w-4" />
                        Удалить
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          {parent && !deleted && (
            <button
              type="button"
              onClick={scrollToParent}
              className="mt-1 mb-1 max-w-full rounded-sm border-l-2 border-indigo-400 bg-zinc-100 px-2 py-1 text-left text-xs text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span className="block font-semibold">{parent.member.profile.name}</span>
              <span className="line-clamp-1">{parent.deleted ? "Сообщение удалено" : parent.content}</span>
            </button>
          )}
          {isImage && fileUrl && (
            <button
              type="button"
              onClick={() => onOpenImage?.(fileUrl)}
              className="relative aspect-square rounded-md mt-2 overflow-hidden border flex items-center bg-secondary h-48 w-48"
            >
              <Image
                src={fileUrl}
                alt={content}
                fill
                className="object-cover"
              />
            </button>
          )}
          {isAudio && fileUrl && (
            <VoicePlayer src={fileUrl} />
          )}
          {isPDF && (
            <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10">
              <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />
              <a 
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
              >
                PDF файл
              </a>
            </div>
          )}
          {!fileUrl && !isEditing && (!poll || deleted) && (
            <MessageContent content={content} deleted={deleted} isUpdated={isUpdated} mentionNames={mentionNames} />
          )}
          {!fileUrl && !deleted && poll && (
            <PollBlock poll={poll} currentMemberId={currentMember.id} />
          )}
          {!fileUrl && isEditing && (
            <Form {...form}>
              <form 
                className="flex items-center w-full gap-x-2 pt-2"
                onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative w-full">
                            <Input
                              disabled={isLoading}
                              className="p-2 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                              placeholder="Изменено"
                              {...field}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  form.reset({ content });
                                  setIsEditing(false);
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    disabled={isLoading}
                    onClick={() => {
                      form.reset({ content });
                      setIsEditing(false);
                    }}
                    size="sm"
                    variant="ghost"
                    type="button"
                  >
                    Отмена
                  </Button>
                  <Button disabled={isLoading} size="sm" variant="primary">
                    Сохранить
                  </Button>
              </form>
              <span className="text-[10px] mt-1 text-zinc-400">
                Нажмите esc для отмены, enter для изменения
              </span>
            </Form>
          )}
          {!deleted && (repliesCount > 0 || reactionEntries.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {repliesCount > 0 && onOpenThread && (
                <button
                  type="button"
                  onClick={() => onOpenThread(id)}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                >
                  {repliesCount} {repliesCount === 1 ? "ответ" : "ответов"} · открыть тред
                </button>
              )}
              {reactionEntries.map(([emoji, list]) => {
                const active = list.some((reaction) => reaction.memberId === currentMember.id);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => chooseReaction(emoji)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition",
                      active
                        ? "border-indigo-400 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                        : "border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{list.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {!deleted && isReactionPickerOpen && (
        <div
          data-reaction-ignore
          role="menu"
          aria-label="Выбрать реакцию"
          className="absolute -top-9 right-14 z-20 flex items-center gap-1 rounded-full border bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => chooseReaction(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:bg-zinc-800"
              aria-label={`Реакция ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {!deleted && (
        <div className="group-hover:opacity-100 focus-within:opacity-100 group-hover:pointer-events-auto focus-within:pointer-events-auto opacity-0 pointer-events-none flex items-center gap-x-2 absolute p-1 -top-2 right-5 bg-white dark:bg-zinc-800 border rounded-sm transition-opacity">
          {!deleted && (
            <ActionTooltip label="Копировать текст">
              <button
                onClick={copyMessageText}
                className="cursor-pointer ml-auto transition text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                aria-label="Копировать текст"
                type="button"
              >
                <Copy className="w-4 h-4" />
              </button>
            </ActionTooltip>
          )}
          {!deleted && (
            <ActionTooltip label="Ссылка на сообщение">
              <button
                onClick={copyMessageLink}
                className="cursor-pointer ml-auto transition text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                aria-label="Ссылка на сообщение"
                type="button"
              >
                <Link className="w-4 h-4" />
              </button>
            </ActionTooltip>
          )}
          {!deleted && (
            <ActionTooltip label="Ответить">
              <button
                onClick={replyToMessage}
                className="cursor-pointer ml-auto transition text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                aria-label="Ответить"
                type="button"
              >
                <Reply className="w-4 h-4" />
              </button>
            </ActionTooltip>
          )}
          {!deleted && (
            <ActionTooltip label="Реакция">
              <button
                onClick={openReactionPicker}
                className="cursor-pointer ml-auto transition text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                aria-label="Открыть реакции"
                type="button"
              >
                <SmilePlus className="w-4 h-4" />
              </button>
            </ActionTooltip>
          )}
          {canPinMessage && (
            <ActionTooltip label={pinned ? "Открепить" : "Закрепить"}>
              <button
                onClick={onPin}
                className={cn(
                  "cursor-pointer ml-auto transition text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2",
                  pinned && "text-amber-500"
                )}
                aria-label={pinned ? "Открепить" : "Закрепить"}
                type="button"
              >
                <Pin className="w-4 h-4" />
              </button>
            </ActionTooltip>
          )}
          {!deleted && (
            <ActionTooltip label="Переслать">
              <button
                onClick={openForwardModal}
                className="cursor-pointer ml-auto transition text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                aria-label="Переслать"
                type="button"
              >
                <Forward className="w-4 h-4" />
              </button>
            </ActionTooltip>
          )}
          {!deleted && (
            <ActionTooltip label={savedByCurrentMember ? "Убрать из избранного" : "Сохранить"}>
              <button
                onClick={onSave}
                className={cn(
                  "cursor-pointer ml-auto transition text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2",
                  savedByCurrentMember && "text-indigo-500"
                )}
                aria-label={savedByCurrentMember ? "Убрать из избранного" : "Сохранить"}
                type="button"
              >
                <Bookmark className={cn("w-4 h-4", savedByCurrentMember && "fill-current")} />
              </button>
            </ActionTooltip>
          )}
          {canEditMessage && (
            <ActionTooltip label="Редактировать">
              <button
                onClick={startEditing}
                className="cursor-pointer ml-auto transition text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                aria-label="Редактировать"
                type="button"
              >
                <Edit className="w-4 h-4" />
              </button>
            </ActionTooltip>
          )}
          {canDeleteMessage && (
            <ActionTooltip label="Удалить">
              <button
                onClick={openDeleteModal}
                className="cursor-pointer ml-auto transition text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                aria-label="Удалить"
                type="button"
              >
                <Trash className="w-4 h-4" />
              </button>
            </ActionTooltip>
          )}
        </div>
      )}
    </div>
  )
})

ChatItem.displayName = "ChatItem";
