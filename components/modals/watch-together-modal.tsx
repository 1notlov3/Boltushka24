"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Airplay, ListVideo, UsersRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { extractYoutubeId } from "@/lib/youtube";

const formSchema = z.object({
  url: z.string().min(1, {
    message: "Ссылка на YouTube обязательна",
  }),
});

export const WatchTogetherModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "watchTogether";
  const serverId = data.query?.serverId as string | undefined;
  const channelId = data.query?.channelId as string | undefined;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const videoId = extractYoutubeId(values.url);

    if (!videoId) {
      form.setError("url", {
        message: "Не смог распознать YouTube ссылку. Вставь полную ссылку или ID видео",
      });
      return;
    }

    if (!serverId || !channelId) {
      form.setError("url", {
        message: "Открой модалку из шапки канала, чтобы запустить просмотр в нужном канале",
      });
      return;
    }

    form.reset();
    onClose();
    router.push(`/servers/${serverId}/channels/${channelId}/watch?v=${videoId}`);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-[#313338] dark:text-zinc-100">
        <DialogHeader className="space-y-3 px-6 pt-8 text-left">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            <Airplay className="h-3.5 w-3.5" />
            Watch together
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Совместный просмотр YouTube
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Вставь ссылку — Boltushka24 откроет комнату с синхронным плеером, очередью и чатом канала рядом.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
            <UsersRound className="mb-2 h-4 w-4 text-indigo-500" />
            <p className="text-sm font-semibold">Синхронная сессия</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Play, pause и перемотка отправляются всем участникам комнаты.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
            <ListVideo className="mb-2 h-4 w-4 text-indigo-500" />
            <p className="text-sm font-semibold">Очередь + чат</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Видео можно добавить в очередь, не уходя из обсуждения канала.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6 pb-6">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        className="h-11 border-zinc-200 bg-zinc-100 text-zinc-900 placeholder:text-zinc-500 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        placeholder="https://www.youtube.com/watch?v=..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <Button className="w-full sm:w-auto" variant="primary" disabled={isLoading}>
                Запустить просмотр
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
