"use client";

import * as z from "zod";
import axios from "axios";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, SendHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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

interface ChatInputProps {
  apiUrl: string;
  query: Record<string, any>;
  name: string;
  type: "conversation" | "channel";
  queryKey?: string;
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
}: ChatInputProps) => {
  const { onOpen } = useModal();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    }
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: apiUrl,
        query,
      });

      const { data } = await axios.post<AnyMessage>(url, values);

      form.reset();

      if (queryKey && data?.id) {
        queryClient.setQueryData([queryKey], (old: any) => {
          if (!old?.pages?.length) return old;
          const exists = old.pages.some((p: any) =>
            p?.items?.some((m: AnyMessage) => m?.id === data.id)
          );
          if (exists) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              { ...first, items: [data, ...((first?.items as AnyMessage[]) ?? [])] },
              ...rest,
            ],
          };
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  const hasContent = !!form.watch("content")?.trim();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
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
                    disabled={isLoading}
                    className="pl-14 pr-20 sm:pr-16 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200 text-base rounded-xl"
                    placeholder={`Сообщение для ${type === "conversation" ? name : "#" + name}`}
                    aria-label="Введите сообщение"
                    {...field}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 right-14 sm:right-8 flex items-center">
                    <EmojiPicker
                      onChange={(emoji: string) => field.onChange(`${field.value} ${emoji}`)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !hasContent}
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
