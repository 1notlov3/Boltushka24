"use client";

import { ModerationReportReason } from "@prisma/client";
import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModal } from "@/hooks/use-modal-store";
import { http } from "@/lib/http";
import { moderationReasonLabels } from "@/lib/moderation";

const reasons = Object.values(ModerationReportReason);

export const ReportMessageModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [reason, setReason] = useState<ModerationReportReason>(ModerationReportReason.SPAM);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "reportMessage";
  const serverId = data.serverId;
  const message = data.message;

  const handleClose = () => {
    setReason(ModerationReportReason.SPAM);
    setComment("");
    onClose();
  };

  const onSubmit = async () => {
    if (!serverId || !message?.id) return;

    try {
      setIsLoading(true);
      await http.post(`/api/servers/${serverId}/reports`, {
        reason,
        comment: comment.trim() || null,
        messageId: message.id,
      });
      toast.success("Жалоба отправлена модераторам");
      handleClose();
    } catch (error) {
      console.log(error);
      toast.error("Не удалось отправить жалобу");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <Flag className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl text-center font-bold">
            Пожаловаться на сообщение
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Жалоба попадет в очередь модераторов сервера.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6">
          <div className="rounded-md border bg-zinc-50 p-3 text-sm text-zinc-600 line-clamp-3">
            {message?.content || "Вложение без текста"}
          </div>
          <Select value={reason} onValueChange={(value) => setReason(value as ModerationReportReason)}>
            <SelectTrigger>
              <SelectValue placeholder="Причина" />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((item) => (
                <SelectItem key={item} value={item}>{moderationReasonLabels[item]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            disabled={isLoading}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            placeholder="Комментарий для модераторов"
          />
        </div>
        <DialogFooter className="bg-gray-100 px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <Button disabled={isLoading} onClick={handleClose} variant="ghost">
              Отмена
            </Button>
            <Button disabled={isLoading} isLoading={isLoading} variant="destructive" onClick={onSubmit}>
              Отправить жалобу
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
