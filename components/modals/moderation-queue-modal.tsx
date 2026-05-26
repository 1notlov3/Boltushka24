"use client";

import { ModerationReportReason, ModerationReportStatus } from "@prisma/client";
import { Ban, CheckCircle2, Clock, ShieldAlert, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useModal } from "@/hooks/use-modal-store";
import { http } from "@/lib/http";
import { moderationReasonLabels, timeoutPresets } from "@/lib/moderation";

type ReportItem = {
  id: string;
  reason: ModerationReportReason;
  comment: string | null;
  status: ModerationReportStatus;
  createdAt: string;
  reporterMember: { profile: { name: string } };
  targetMember: { id: string; profile: { id: string; name: string } } | null;
  message: {
    id: string;
    content: string;
    channel: { id: string; name: string };
    member: { id: string; profile: { name: string } };
  } | null;
};

export const ModerationQueueModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const isModalOpen = isOpen && type === "moderationQueue";
  const serverId = data.server?.id;

  const loadReports = useCallback(async () => {
    if (!serverId) return;
    try {
      setIsLoading(true);
      const { data } = await http.get<{ items: ReportItem[] }>(`/api/servers/${serverId}/reports?status=OPEN`);
      setReports(data.items);
    } catch (error) {
      console.log(error);
      toast.error("Не удалось загрузить очередь модерации");
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    if (isModalOpen) void loadReports();
  }, [isModalOpen, loadReports]);

  const updateReport = async (reportId: string, status: "RESOLVED" | "DISMISSED") => {
    if (!serverId) return;
    try {
      setActionId(reportId);
      await http.patch(`/api/servers/${serverId}/reports/${reportId}`, { status });
      setReports((items) => items.filter((item) => item.id !== reportId));
      toast.success(status === "RESOLVED" ? "Жалоба закрыта" : "Жалоба отклонена");
    } catch (error) {
      console.log(error);
      toast.error("Действие не выполнено");
    } finally {
      setActionId(null);
    }
  };

  const moderateMember = async (report: ReportItem, action: "timeout" | "ban") => {
    if (!serverId) return;
    const targetId = report.targetMember?.id ?? report.message?.member.id;
    if (!targetId) return;

    try {
      setActionId(report.id);
      await http.patch(`/api/servers/${serverId}/members/${targetId}/moderation`, action === "timeout"
        ? {
            action,
            durationSeconds: timeoutPresets[0].seconds,
            reason: moderationReasonLabels[report.reason],
            reportId: report.id,
          }
        : {
            action,
            reason: moderationReasonLabels[report.reason],
            reportId: report.id,
          });
      setReports((items) => items.filter((item) => item.id !== report.id));
      toast.success(action === "timeout" ? "Таймаут выдан" : "Пользователь забанен");
    } catch (error) {
      console.log(error);
      toast.error("Действие не выполнено");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden max-w-3xl">
        <DialogHeader className="pt-8 px-6">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl text-center font-bold">
            Очередь модерации
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Открытые жалобы, таймауты и баны для публичных сообществ.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          {isLoading && <p className="py-8 text-center text-sm text-zinc-500">Загрузка...</p>}
          {!isLoading && reports.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
              Открытых жалоб нет. Сервер чист.
            </div>
          )}
          <div className="space-y-3">
            {reports.map((report) => {
              const targetName = report.targetMember?.profile.name ?? report.message?.member.profile.name ?? "Неизвестный пользователь";
              return (
                <div key={report.id} className="rounded-lg border bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{moderationReasonLabels[report.reason]}</p>
                      <p className="text-xs text-zinc-500">
                        Жалоба от {report.reporterMember.profile.name} на {targetName}
                      </p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">OPEN</span>
                  </div>
                  {report.message && (
                    <div className="mt-3 rounded-md bg-white p-3 text-sm text-zinc-700">
                      <p className="text-xs text-zinc-400">#{report.message.channel.name}</p>
                      <p className="line-clamp-3">{report.message.content || "Вложение без текста"}</p>
                    </div>
                  )}
                  {report.comment && <p className="mt-2 text-sm text-zinc-600">Комментарий: {report.comment}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled={actionId === report.id} size="sm" variant="outline" onClick={() => updateReport(report.id, "DISMISSED")}>
                      <XCircle className="mr-2 h-4 w-4" /> Отклонить
                    </Button>
                    <Button disabled={actionId === report.id} size="sm" variant="outline" onClick={() => updateReport(report.id, "RESOLVED")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Закрыть
                    </Button>
                    <Button disabled={actionId === report.id} size="sm" variant="primary" onClick={() => moderateMember(report, "timeout")}>
                      <Clock className="mr-2 h-4 w-4" /> Таймаут 10 минут
                    </Button>
                    <Button disabled={actionId === report.id} size="sm" variant="destructive" onClick={() => moderateMember(report, "ban")}>
                      <Ban className="mr-2 h-4 w-4" /> Бан
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
