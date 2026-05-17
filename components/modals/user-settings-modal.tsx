"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useModal } from "@/hooks/use-modal-store";

type SettingsPayload = {
  theme: string;
  language: string;
  compactMode: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  showOnlineStatus: boolean;
};

type ProfilePayload = {
  status: string;
  customStatus: string | null;
};

export const UserSettingsModal = () => {
  const { isOpen, type, onClose } = useModal();
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [profile, setProfile] = useState<ProfilePayload>({ status: "ONLINE", customStatus: "" });
  const [isPushLoading, setIsPushLoading] = useState(false);
  const isModalOpen = isOpen && type === "userSettings";

  useEffect(() => {
    if (!isModalOpen) return;

    const load = async () => {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const payload = await response.json() as { settings: SettingsPayload; profile: ProfilePayload };
        setSettings(payload.settings);
        setProfile({
          status: payload.profile.status,
          customStatus: payload.profile.customStatus ?? "",
        });
      }
    };

    load();
  }, [isModalOpen]);

  const save = async () => {
    if (!settings) return;
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, ...profile }),
    });
    onClose();
  };

  const enablePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push-уведомления недоступны в этом браузере");
      return;
    }

    setIsPushLoading(true);

    try {
      const configResponse = await fetch("/api/push/subscribe");
      const config = await configResponse.json() as { enabled: boolean; publicKey: string | null };

      if (!config.enabled || !config.publicKey) {
        toast.error("Push-уведомления не настроены на сервере");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Разрешение на уведомления не выдано");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) throw new Error("Push subscribe failed");

      toast.success("Push-уведомления включены");
    } catch (error) {
      console.error("[PUSH_ENABLE]", error);
      toast.error("Не удалось включить уведомления");
    } finally {
      setIsPushLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-900 dark:text-zinc-100">
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
        </DialogHeader>
        {settings && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Тема</Label>
              <Select value={settings.theme} onValueChange={(theme) => setSettings({ ...settings, theme })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Системная</SelectItem>
                  <SelectItem value="dark">Тёмная</SelectItem>
                  <SelectItem value="light">Светлая</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Статус</Label>
              <Select value={profile.status} onValueChange={(status) => setProfile({ ...profile, status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLINE">Онлайн</SelectItem>
                  <SelectItem value="IDLE">Отошёл</SelectItem>
                  <SelectItem value="DND">Не беспокоить</SelectItem>
                  <SelectItem value="INVISIBLE">Невидимый</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Пользовательский статус</Label>
              <Input
                value={profile.customStatus ?? ""}
                onChange={(event) => setProfile({ ...profile, customStatus: event.target.value })}
                placeholder="Например: работаю"
              />
            </div>
            {([
              ["compactMode", "Компактный режим"],
              ["notificationsEnabled", "Уведомления"],
              ["soundEnabled", "Звуки"],
              ["showOnlineStatus", "Показывать онлайн"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                {label}
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })}
                  className="h-4 w-4"
                />
              </label>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={enablePush}
              disabled={isPushLoading}
              isLoading={isPushLoading}
            >
              Включить уведомления
            </Button>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="button" variant="primary" onClick={save}>Сохранить</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}
