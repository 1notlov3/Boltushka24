"use client";

import * as z from "zod";
import { http } from "@/lib/http";
import { isAxiosError } from "axios";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileIcon, ImageIcon, Loader2, Plus, SendHorizontal, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Member, Profile } from "@prisma/client";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { applySlashCommand, parseGifCommand, parsePollCommand } from "@/lib/message-formatting";
import type { ReplyTarget } from "@/components/chat/chat-shell";
import { VoiceRecorder } from "@/components/voice-recorder";
import {
  ALLOWED_MESSAGE_FILE_TYPES,
  uploadToSupabase,
  validateUploadFile,
} from "@/lib/upload";
import { enqueueOutboxMessage, type OutboxMessagePayload } from "@/lib/outbox";

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
type ChatCachePage = { items: AnyMessage[]; [key: string]: unknown };
type ChatCacheData = { pages: ChatCachePage[]; pageParams?: unknown[]; [key: string]: unknown };
type MentionSuggestion = {
  id: string;
  name: string;
  imageUrl: string;
};
type TenorSearchResponse = {
  enabled: boolean;
  items: { url: string }[];
};
type UploadPreview = {
  id: string;
  name: string;
  type: string;
  previewUrl: string | null;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

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
  const draftWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = useMemo(() => `draft:${queryKey ?? apiUrl}`, [apiUrl, queryKey]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const [uploadPreviews, setUploadPreviews] = useState<UploadPreview[]>([]);
  const [isUploadingDrop, setIsUploadingDrop] = useState(false);
  const uploadPreviewsRef = useRef<UploadPreview[]>([]);

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

  useEffect(() => {
    return () => {
      if (draftWriteTimerRef.current) {
        clearTimeout(draftWriteTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    uploadPreviewsRef.current = uploadPreviews;
  }, [uploadPreviews]);

  useEffect(() => {
    return () => {
      uploadPreviewsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const queueDraftWrite = (value: string) => {
    if (draftWriteTimerRef.current) {
      clearTimeout(draftWriteTimerRef.current);
    }

    draftWriteTimerRef.current = setTimeout(() => {
      window.localStorage.setItem(storageKey, value);
      draftWriteTimerRef.current = null;
    }, 300);
  };

  const clearDraft = () => {
    if (draftWriteTimerRef.current) {
      clearTimeout(draftWriteTimerRef.current);
      draftWriteTimerRef.current = null;
    }

    window.localStorage.removeItem(storageKey);
  };

  useEffect(() => {
    if (mentionQuery === null || !query.serverId) {
      setMentionSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ q: mentionQuery });

      void fetch(`/api/servers/${query.serverId}/members?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("Mention search failed");
          return response.json() as Promise<{ items?: MentionSuggestion[] }>;
        })
        .then((payload) => {
          setMentionSuggestions(payload.items ?? []);
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            console.error("[MENTION_SEARCH]", error);
          }
        });
    }, 150);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [mentionQuery, query.serverId]);

  const updateMentionQuery = (value: string) => {
    const match = value.match(/(^|\s)@([\p{L}\p{N}_.-]*)$/u);
    setMentionQuery(match ? match[2] : null);
  };

  const insertMention = (
    member: MentionSuggestion,
    value: string,
    onChange: (value: string) => void,
  ) => {
    const nextValue = value.replace(/(^|\s)@([\p{L}\p{N}_.-]*)$/u, `$1<@${member.id}> `);
    onChange(nextValue);
    queueDraftWrite(nextValue);
    setMentionQuery(null);
    setMentionSuggestions([]);
  };

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

  const markMessageOutbox = (tempId: string) => {
    if (!queryKey) return;
    queryClient.setQueryData<ChatCacheData>([queryKey], (old) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((message) => (
            message.id === tempId ? { ...message, outbox: true } : message
          )),
        })),
      };
    });
  };

  const isNetworkMessageError = (error: unknown) => (
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (isAxiosError(error) && !error.response)
  );

  const createOptimisticMessage = (
    tempId: string,
    content: string,
    fileUrl: string | null,
    poll: unknown = null,
  ) => {
    const now = new Date().toISOString();

    return currentMember
      ? {
          id: tempId,
          content,
          fileUrl,
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
          poll,
        }
      : null;
  };

  const sendAttachmentMessage = async (fileUrl: string, content = fileUrl) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = createOptimisticMessage(tempId, content, fileUrl);

    if (optimistic) insertMessage(optimistic);

    try {
      const { data } = await http.post<AnyMessage>(qs.stringifyUrl({ url: apiUrl, query }), {
        content,
        fileUrl,
        ...(type === "channel" ? { parentMessageId: replyTo?.id } : { parentDirectMessageId: replyTo?.id }),
      });

      if (optimistic && data?.id) {
        replaceMessage(tempId, data);
      } else if (data?.id) {
        insertMessage(data);
      }

      onClearReply?.();
    } catch (error) {
      console.log(error);
      toast.error("Не удалось отправить вложение");
      if (optimistic) removeMessage(tempId);
      throw error;
    }
  };

  const sendVoiceMessage = async (fileUrl: string, durationSeconds: number) => {
    await sendAttachmentMessage(fileUrl, `Голосовое сообщение · ${durationSeconds} с`);
  };

  const removeUploadPreview = (id: string) => {
    setUploadPreviews((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const handleDroppedFiles = async (files: FileList | File[]) => {
    const fileItems = Array.from(files);
    if (!fileItems.length || isUploadingDrop) return;

    const tasks = fileItems.map((file) => {
      const id = crypto.randomUUID();
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      const validationError = validateUploadFile(file, ALLOWED_MESSAGE_FILE_TYPES);

      return {
        id,
        file,
        preview: {
          id,
          name: file.name,
          type: file.type,
          previewUrl,
          progress: validationError ? 0 : 5,
          status: validationError ? "error" as const : "pending" as const,
          error: validationError ?? undefined,
        },
      };
    });

    setUploadPreviews((current) => [...current, ...tasks.map((task) => task.preview)]);
    setIsUploadingDrop(true);

    for (const task of tasks) {
      if (task.preview.status === "error") continue;

      setUploadPreviews((current) => current.map((item) => (
        item.id === task.id ? { ...item, status: "uploading", progress: 35 } : item
      )));

      try {
        const fileUrl = await uploadToSupabase(task.file, "messageFile", task.file.name);
        setUploadPreviews((current) => current.map((item) => (
          item.id === task.id ? { ...item, progress: 80 } : item
        )));
        await sendAttachmentMessage(fileUrl, task.file.name);
        setUploadPreviews((current) => current.map((item) => (
          item.id === task.id ? { ...item, status: "done", progress: 100 } : item
        )));
      } catch (error) {
        console.error("[DROP_UPLOAD]", error);
        setUploadPreviews((current) => current.map((item) => (
          item.id === task.id
            ? { ...item, status: "error", progress: 0, error: "Ошибка загрузки" }
            : item
        )));
      }
    }

    setIsUploadingDrop(false);
    setTimeout(() => {
      setUploadPreviews((current) => {
        current
          .filter((item) => item.status === "done")
          .forEach((item) => {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          });
        return current.filter((item) => item.status !== "done");
      });
    }, 1500);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const pollCommand = type === "channel" ? parsePollCommand(values.content) : null;
    const isPollAttempt = /^\/poll(?:\s|$)/.test(values.content.trim());

    if (isPollAttempt && !pollCommand) {
      toast.error('Формат опроса: /poll "Вопрос" "Вариант 1" "Вариант 2"');
      return;
    }

    if (pollCommand && (!query.serverId || !query.channelId)) {
      toast.error("Опросы доступны только в каналах сервера");
      return;
    }

    const gifQuery = pollCommand ? null : parseGifCommand(values.content);
    let gifFileUrl: string | null = null;

    if (gifQuery) {
      try {
        const response = await http.get<TenorSearchResponse>("/api/tenor/search", {
          params: {
            q: gifQuery,
            limit: 1,
          },
        });
        gifFileUrl = response.data.items[0]?.url ?? null;
      } catch (error) {
        console.log(error);
      }
    }

    const content = pollCommand ? `Опрос: ${pollCommand.question}` : applySlashCommand(values.content);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = createOptimisticMessage(
      tempId,
      content,
      gifFileUrl,
      pollCommand
      ? {
          id: `temp-poll-${tempId}`,
          question: pollCommand.question,
          options: pollCommand.options,
          multiple: pollCommand.multiple,
          closesAt: null,
          votes: [],
        }
      : null,
    );

    if (optimistic) insertMessage(optimistic);

    const messagePayload: OutboxMessagePayload = {
      content,
      fileUrl: gifFileUrl,
      ...(type === "channel" ? { parentMessageId: replyTo?.id } : { parentDirectMessageId: replyTo?.id }),
    };

    try {
      const { data } = pollCommand
        ? await http.post<AnyMessage>("/api/polls", {
            serverId: query.serverId,
            channelId: query.channelId,
            question: pollCommand.question,
            options: pollCommand.options,
            multiple: pollCommand.multiple,
          })
        : await http.post<AnyMessage>(qs.stringifyUrl({ url: apiUrl, query }), messagePayload);

      if (optimistic && data?.id) {
        replaceMessage(tempId, data);
      } else if (data?.id) {
        insertMessage(data);
      }
      form.reset();
      clearDraft();
      onClearReply?.();
    } catch (error) {
      console.log(error);
      if (!pollCommand && optimistic && queryKey && isNetworkMessageError(error)) {
        await enqueueOutboxMessage({
          id: tempId,
          queryKey,
          apiUrl,
          query,
          payload: messagePayload,
          createdAt: Date.now(),
        });
        markMessageOutbox(tempId);
        form.reset();
        clearDraft();
        onClearReply?.();
        toast.info("Нет соединения. Сообщение отправится позже.");
        return;
      }

      toast.error("Не удалось отправить сообщение");
      if (optimistic) removeMessage(tempId);
    }
  }

  const hasContent = !!form.watch("content")?.trim();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative shrink-0"
        onDragEnter={(event) => {
          event.preventDefault();
          setDragDepth((value) => value + 1);
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragDepth((value) => Math.max(0, value - 1));
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragDepth(0);
          void handleDroppedFiles(event.dataTransfer.files);
        }}
      >
        {dragDepth > 0 && (
          <div className="pointer-events-none absolute inset-x-3 bottom-20 z-40 flex min-h-24 items-center justify-center rounded-md border-2 border-dashed border-indigo-400 bg-indigo-500/10 text-sm font-semibold text-indigo-600 backdrop-blur-sm dark:text-indigo-200">
            Бросьте файл сюда
          </div>
        )}
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
        {!!uploadPreviews.length && (
          <div className="mx-3 mb-1 flex gap-2 overflow-x-auto rounded-md border border-zinc-200 bg-white px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900 sm:mx-4">
            {uploadPreviews.map((item) => (
              <div
                key={item.id}
                className="relative flex min-w-48 items-center gap-2 rounded-md bg-zinc-100 p-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-700">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : item.type.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5" />
                  ) : (
                    <FileIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-300 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-[width]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.status === "error" && (
                    <p className="mt-1 text-rose-500">{item.error}</p>
                  )}
                </div>
                {item.status === "uploading" && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                {item.status !== "uploading" && (
                  <button
                    type="button"
                    onClick={() => removeUploadPreview(item.id)}
                    className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-white"
                    aria-label="Убрать вложение"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
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
                  <VoiceRecorder
                    onSend={sendVoiceMessage}
                    disabled={form.formState.isSubmitting || isUploadingDrop}
                    className="absolute top-1/2 left-14 flex -translate-y-1/2 items-center justify-center sm:left-[4.75rem]"
                  />
                  {!!mentionSuggestions.length && (
                    <div className="absolute bottom-full left-14 z-20 mb-2 w-64 overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                      {mentionSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            insertMention(suggestion, field.value, field.onChange);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <span className="h-6 w-6 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={suggestion.imageUrl} alt="" className="h-full w-full object-cover" />
                          </span>
                          <span className="truncate">{suggestion.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <Input
                    disabled={false}
                    className="pl-24 pr-20 sm:pr-16 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200 text-base rounded-xl"
                    placeholder={`Сообщение для ${type === "conversation" ? name : "#" + name}`}
                    aria-label="Введите сообщение"
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      updateMentionQuery(event.target.value);
                      queueDraftWrite(event.target.value);
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
                    disabled={!hasContent || form.formState.isSubmitting || isUploadingDrop}
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
