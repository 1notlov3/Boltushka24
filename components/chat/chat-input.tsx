"use client";

import * as z from "zod";
import axios from "axios";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, SendHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Member, Profile } from "@prisma/client";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { EmojiPicker } from "@/components/emoji-picker";
import { ActionTooltip } from "@/components/action-tooltip";
import { applySlashCommand } from "@/lib/message-formatting";
import type { ReplyTarget } from "@/components/chat/chat-shell";
import { X } from "lucide-react";

interface ChatInputProps {
  apiUrl: string;
  query: Record<string, string>;
  name: string;
  type: "conversation" | "channel";
  queryKey?: string;
  currentMember?: Member & { profile: Profile };
  replyTo?: ReplyTarget | null;
  onClearReply?: () => void;
  onTyping?: () => void;
}

const formSchema = z.object({
  content: z.string().min(1),
});

type AnyMessage = { id: string; [k: string]: unknown };

export const ChatInput = ({
  apiUrl,
  query,
  name,
  type,
  queryKey,
  currentMember,
  replyTo,
  onClearReply,
  onTyping,
}: ChatInputProps) => {
  const { onOpen } = useModal();
  const queryClient = useQueryClient();
  const typingSentAtRef = useRef(0);
  const storageKey = useMemo(() => `draft:${queryKey ?? apiUrl}`, [apiUrl, queryKey]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    }
  });

  useEffect(() => {
    const draft = window.localStorage.getItem(storageKey);
    if (draft) {
      form.setValue("content", draft);
    }
  }, [form, storageKey]);

  const insertMessage = (message: AnyMessage) => {
    if (!queryKey) return;
    queryClient.setQueryData([queryKey], (old: any) => {
      if (!old?.pages?.length) return old;
      const exists = old.pages.some((p: any) =>
        p?.items?.some((m: AnyMessage) => m?.id === message.id)
      );
      if (exists) return old;
      const [first, ...rest] = old.pages;
      return {
        ...old,
        pages: [
          { ...first, items: [message, ...((first?.items as AnyMessage[]) ?? [])] },
          ...rest,
        ],
      };
    });
  };

  const replaceMessage = (tempId: string, real: AnyMessage) => {
    if (!queryKey) return;
    queryClient.setQueryData([queryKey], (old: any) => {
      if (!old?.pages?.length) return old;
      const realExists = old.pages.some((p: any) =>
        p?.items?.some((m: AnyMessage) => m?.id === real.id)
      );
      return {
        ...old,
        pages: old.pages.map((p: any) => ({
          ...p,
          items: (p?.items ?? [])
            .filter((m: AnyMessage) => m?.id !== tempId)
            .reduce((acc: AnyMessage[], m: AnyMessage) => {
              if (!realExists && acc.length === 0 && p === old.pages[0]) {
                acc.push(real);
              }
              acc.push(m);
              return acc;
            }, [] as AnyMessage[]),
        })),
      };
    });
  };

  const removeMessage = (tempId: string) => {
    if (!queryKey) return;
    queryClient.setQueryData([queryKey], (old: any) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((p: any) => ({
          ...p,
          items: (p?.items ?? []).filter((m: AnyMessage) => m?.id !== tempId),
        })),
      };
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const content = applySlashCommand(values.content);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const optimistic = currentMember
      ? {
          id: tempId,
          content,
          fileUrl: null,
          deleted: false,
          createdAt: now,
          updatedAt: now,
          memberId: currentMember.id,
          channelId: query.channelId ?? null,
          conversationId: query.conversationId ?? null,
          parentMessageId: type === "channel" ? replyTo?.id ?? null : null,
          parentDirectMessageId: type === "conversation" ? replyTo?.id ?? null : null,
          parentMessage: type === "channel" && replyTo
            ? {
                id: replyTo.id,
                content: replyTo.content,
                deleted: false,
                member: { id: "", role: currentMember.role, profile: { ...currentMember.profile, name: replyTo.authorName } },
              }
            : null,
          parentDirectMessage: type === "conversation" && replyTo
            ? {
                id: replyTo.id,
                content: replyTo.content,
                deleted: false,
                member: { id: "", role: currentMember.role, profile: { ...currentMember.profile, name: replyTo.authorName } },
              }
            : null,
          reactions: [],
          savedBy: [],
          pinned: false,
          member: currentMember,
        }
      : null;

    if (optimistic) insertMessage(optimistic);
    form.reset();
    window.localStorage.removeItem(storageKey);
    onClearReply?.();

    try {
      const url = qs.stringifyUrl({ url: apiUrl, query });
      const { data } = await axios.post<AnyMessage>(url, {
        ...values,
        content,
        ...(type === "channel" ? { parentMessageId: replyTo?.id } : { parentDirectMessageId: replyTo?.id }),
      });
      if (optimistic && data?.id) {
        replaceMessage(tempId, data);
      } else if (data?.id) {
        insertMessage(data);
      }
    } catch (error) {
      console.log(error);
      toast.error("Не удалось отправить сообщение");
      if (optimistic) removeMessage(tempId);
    }
  }

  const hasContent = !!form.watch("content")?.trim();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {replyTo && (
          <div className="mx-3 mb-1 flex items-center justify-between rounded-md border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-200 sm:mx-4">
            <div className="min-w-0">
              <p className="font-semibold">Ответ для {replyTo.authorName}</p>
              <p className="truncate text-zinc-500 dark:text-zinc-400">{replyTo.content}</p>
            </div>
            <button
              type="button"
              onClick={onClearReply}
              className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
              aria-label="Отменить ответ"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div
                  className="relative px-3 sm:px-4 pt-3 pb-3 sm:pb-6"
                  style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
                >
                  <ActionTooltip label="Прикрепить файл" side="top">
                    <button
                      type="button"
                      onClick={() => onOpen("messageFile", { apiUrl, query })}
                      className="absolute top-1/2 -translate-y-1/2 left-5 sm:left-8 h-7 w-7 bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center justify-center shrink-0"
                      aria-label="Прикрепить файл"
                    >
                      <Plus className="h-5 w-5 text-white dark:text-[#313338]" />
                    </button>
                  </ActionTooltip>
                  <Input
                    disabled={false}
                    className="pl-14 pr-20 sm:pr-16 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200 text-base rounded-xl"
                    placeholder={`Сообщение для ${type === "conversation" ? name : "#" + name}`}
                    aria-label="Введите сообщение"
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      window.localStorage.setItem(storageKey, event.target.value);
                      const now = Date.now();
                      if (event.target.value.trim() && now - typingSentAtRef.current > 1200) {
                        typingSentAtRef.current = now;
                        onTyping?.();
                      }
                    }}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 right-14 sm:right-8 flex items-center">
                    <EmojiPicker
                      onChange={(emoji: string) => field.onChange(`${field.value} ${emoji}`)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!hasContent}
                    aria-label="Отправить сообщение"
                    className="absolute top-1/2 -translate-y-1/2 right-5 sm:right-1.5 h-9 w-9 sm:h-7 sm:w-7 rounded-full flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm sm:bg-transparent sm:hover:bg-zinc-300/60 sm:dark:hover:bg-zinc-600/60 sm:text-zinc-600 sm:dark:text-zinc-300 sm:shadow-none"
                  >
                    <SendHorizontal className="h-5 w-5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
