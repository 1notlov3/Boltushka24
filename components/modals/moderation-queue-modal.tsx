"use client";

import { ModerationReportReason, ModerationReportStatus } from "@prisma/client";
import { Ban, CheckCircle2, Clock, History, ShieldAlert, ShieldOff, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { useModal } from "@/hooks/use-modal-store";
import { http } from "@/lib/http";
import { moderationReasonLabels, timeoutPresets } from "@/lib/moderation";

type ModerationTab = "reports" | "bans" | "audit";

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

type BanItem = {
  id: string;
  reason: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  profile: { id: string; name: string; imageUrl: string };
  moderatorProfile: { id: string; name: string; imageUrl: string } | null;
};

type AuditItem = {
  id: string;
  action: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { id: string; name: string; imageUrl: string } | null;
};

const tabs: Array<{ id: ModerationTab; label: string }> = [
  { id: "reports", label: "Жалобы" },
  { id: "bans", label: "Баны" },
  { id: "audit", label: "Журнал" },
];

const actionLabels: Record<string, string> = {
  "moderation.report.create": "Создана жалоба",
  "moderation.report.resolve": "Жалоба закрыта",
  "moderation.report.dismiss": "Жалоба отклонена",
  "moderation.member.timeout": "Выдан таймаут",
  "moderation.member.ban": "Пользователь забанен",
  "moderation.member.unban": "Пользователь разбанен",
  "message.delete.other": "Удалено чужое сообщение",
  "member.kick": "Участник исключен",
};

function formatDate(value: string | null) {
  if (!value) return "Навсегда";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function metadataPreview(value: unknown) {
  if (!value) return "Нет деталей";
  const text = JSON.stringify(value);
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

export const ModerationQueueModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [activeTab, setActiveTab] = useState<ModerationTab>("reports");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [bans, setBans] = useState<BanItem[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const isModalOpen = isOpen && type === "moderationQueue";
  const serverId = data.server?.id;

  const activeTabTitle = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label ?? "Жалобы", [activeTab]);

  const loadReports = useCallback(async () => {
    if (!serverId) return;
    const { data } = await http.get<{ items: ReportItem[] }>(`/api/servers/${serverId}/reports?status=OPEN`);
    setReports(data.items);
  }, [serverId]);

  const loadBans = useCallback(async () => {
    if (!serverId) return;
    const { data } = await http.get<{ items: BanItem[] }>(`/api/servers/${serverId}/bans?active=true`);
    setBans(data.items);
  }, [serverId]);

  const loadAudit = useCallback(async () => {
    if (!serverId) return;
    const { data } = await http.get<{ items: AuditItem[] }>(`/api/servers/${serverId}/audit-log?limit=50`);
    setAuditItems(data.items);
  }, [serverId]);

  const loadActiveTab = useCallback(async () => {
    try {
      setIsLoading(true);
      if (activeTab === "reports") await loadReports();
      if (activeTab === "bans") await loadBans();
      if (activeTab === "audit") await loadAudit();
    } catch (error) {
      console.log(error);
      toast.error(`Не удалось загрузить раздел: ${activeTabTitle}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, activeTabTitle, loadAudit, loadBans, loadReports]);

  useEffect(() => {
    if (isModalOpen) void loadActiveTab();
  }, [isModalOpen, loadActiveTab]);

  const updateReport = async (reportId: string, status: "RESOLVED" | "DISMISSED") => {
    if (!serverId) return;
    try {
      setActionId(reportId);
      await http.patch(`/api/servers/${serverId}/reports/${reportId}`, { status });
      setReports((items) => items.filter((item) => item.id !== reportId));
      toast.success(status === "RESOLVED" ? "Жалоба закрыта" : "Жалоба отклонена");
      if (activeTab === "audit") void loadAudit();
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
      if (action === "ban") void loadBans();
    } catch (error) {
      console.log(error);
      toast.error("Действие не выполнено");
    } finally {
      setActionId(null);
    }
  };

  const unban = async (ban: BanItem) => {
    if (!serverId) return;

    try {
      setActionId(ban.id);
      await http.delete(`/api/servers/${serverId}/bans/${ban.profile.id}`);
      setBans((items) => items.filter((item) => item.id !== ban.id));
      toast.success("Пользователь разбанен");
    } catch (error) {
      console.log(error);
      toast.error("Не удалось разбанить");
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
            Центр модерации
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Жалобы, активные баны и журнал действий сообщества.
          </DialogDescription>
          <div className="mx-auto mt-4 flex rounded-full bg-zinc-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          {isLoading && <p className="py-8 text-center text-sm text-zinc-500">Загрузка...</p>}

          {!isLoading && activeTab === "reports" && (
            <div className="space-y-3">
              {reports.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
                  Открытых жалоб нет. Сервер чист.
                </div>
              )}
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
          )}

          {!isLoading && activeTab === "bans" && (
            <div className="space-y-3">
              {bans.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
                  Активных банов нет.
                </div>
              )}
              {bans.map((ban) => (
                <div key={ban.id} className="rounded-lg border bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{ban.profile.name}</p>
                      <p className="text-xs text-zinc-500">
                        Забанил: {ban.moderatorProfile?.name ?? "Система"} · {formatDate(ban.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                      до {formatDate(ban.expiresAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-600">Причина: {ban.reason || "Не указана"}</p>
                  <div className="mt-4 flex justify-end">
                    <Button disabled={actionId === ban.id} size="sm" variant="outline" onClick={() => unban(ban)}>
                      <ShieldOff className="mr-2 h-4 w-4" /> Разбанить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && activeTab === "audit" && (
            <div className="space-y-3">
              {auditItems.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
                  Журнал пока пуст.
                </div>
              )}
              {auditItems.map((item) => (
                <div key={item.id} className="rounded-lg border bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{actionLabels[item.action] ?? item.action}</p>
                      <p className="text-xs text-zinc-500">
                        {item.actor?.name ?? "Система"} · {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <History className="h-4 w-4 text-zinc-400" />
                  </div>
                  <p className="mt-3 break-all rounded-md bg-white p-3 text-xs text-zinc-600">
                    {metadataPreview(item.metadata)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
