"use client";
import "@uploadthing/react/styles.css";
import axios from "axios";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { redirect, useRouter } from "next/navigation";
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
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { useModal } from "@/hooks/use-modal-store";
import { UploadDropzone } from "@uploadthing/react";
import { useState } from "react";

const formSchema = z.object({
  url: z.string().min(1, {
    message: "Ссылка на видео обязательна"
  }),
});

export const WatchTogetherModal = () => {
    const [videoUrl, setVideoUrl] = useState("");
  const {isOpen,onClose,type} = useModal();
  const router = useRouter();
  const isModalOpen = isOpen && type === "watchTogether";

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    }
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values:any) => {
    window.open(`https://www.watchparty.me/create?video=${values.url}`, '_blank')
  }
const handleClose = () => {
  form.reset();
  onClose();
}

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Смотрите и слушайте вместе!
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
          Создайте комнату для совместного просмотра фильма или прослушивания музыки 
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className=" space-y-8 px-6">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                        placeholder="Введите url видео для совместного просмотра"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="bg-gray-100 px-6 py-4">
              <Button variant="primary" disabled={isLoading}>
                Смотреть!
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}