"use client";

import { ArrowDown, ArrowUp, Plus, Trash } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { http } from "@/lib/http";
import { type Permission } from "@/lib/permissions";
import { useModal } from "@/hooks/use-modal-store";

type ServerRolePayload = {
  id: string;
  name: string;
  color: string;
  permissions: Permission[];
  position: number;
};

const permissionLabels: Record<Permission, string> = {
  "server.manage": "Управление сервером",
  "server.invite": "Приглашения",
  "channel.manage": "Каналы",
  "member.manage": "Участники",
  "message.manage": "Модерация сообщений",
  "message.create": "Отправка сообщений",
  "message.react": "Реакции",
  "message.pin": "Закрепления",
  "message.save": "Избранное",
};

export function RolesModal() {
  const { isOpen, type, data, onClose } = useModal();
  const [roles, setRoles] = useState<ServerRolePayload[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [loading, setLoading] = useState(false);
  const isModalOpen = isOpen && type === "roles";
  const serverId = data.server?.id;

  const loadRoles = useCallback(async () => {
    if (!serverId) return;
    const response = await http.get<{ items: ServerRolePayload[]; permissions: Permission[] }>(`/api/servers/${serverId}/roles`);
    setRoles(response.data.items);
    setPermissions(response.data.permissions);
  }, [serverId]);

  useEffect(() => {
    if (!isModalOpen) return;
    void loadRoles().catch((error: unknown) => {
      console.error("[ROLES_LOAD]", error);
      toast.error("Не удалось загрузить роли");
    });
  }, [isModalOpen, loadRoles]);

  const createRole = async () => {
    if (!serverId || !newRoleName.trim()) return;
    setLoading(true);
    try {
      await http.post(`/api/servers/${serverId}/roles`, {
        name: newRoleName.trim(),
        position: roles.length,
      });
      setNewRoleName("");
      await loadRoles();
    } catch (error) {
      console.error("[ROLE_CREATE]", error);
      toast.error("Не удалось создать роль");
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (role: ServerRolePayload, patch: Partial<ServerRolePayload>) => {
    if (!serverId) return;
    await http.patch(`/api/servers/${serverId}/roles`, {
      roleId: role.id,
      ...patch,
    });
    await loadRoles();
  };

  const deleteRole = async (role: ServerRolePayload) => {
    if (!serverId) return;
    await http.delete(`/api/servers/${serverId}/roles`, { data: { roleId: role.id } });
    await loadRoles();
  };

  const moveRole = async (index: number, direction: -1 | 1) => {
    const current = roles[index];
    const next = roles[index + direction];
    if (!current || !next) return;

    await Promise.all([
      updateRole(current, { position: next.position }),
      updateRole(next, { position: current.position }),
    ]);
  };

  const togglePermission = (role: ServerRolePayload, permission: Permission) => {
    const active = role.permissions.includes(permission);
    const next = active
      ? role.permissions.filter((item) => item !== permission)
      : [...role.permissions, permission];

    void updateRole(role, { permissions: next }).catch((error: unknown) => {
      console.error("[ROLE_PERMISSION]", error);
      toast.error("Не удалось обновить права");
    });
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white text-black dark:bg-zinc-900 dark:text-zinc-100">
        <DialogHeader>
          <DialogTitle>Роли сервера</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={newRoleName}
            onChange={(event) => setNewRoleName(event.target.value)}
            placeholder="Название роли"
          />
          <Button type="button" variant="primary" onClick={createRole} disabled={loading || !newRoleName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Button>
        </div>

        <div className="max-h-[58dvh] space-y-3 overflow-y-auto pr-1">
          {roles.map((role, index) => (
            <div key={role.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="mb-3 flex items-center gap-2">
                <Input
                  value={role.name}
                  onChange={(event) => setRoles((current) => current.map((item) => item.id === role.id ? { ...item, name: event.target.value } : item))}
                  onBlur={() => updateRole(role, { name: role.name })}
                  className="font-semibold"
                />
                <input
                  type="color"
                  value={role.color}
                  onChange={(event) => void updateRole(role, { color: event.target.value })}
                  className="h-10 w-12 rounded-md border border-zinc-200 bg-transparent"
                  aria-label="Цвет роли"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => moveRole(index, -1)} disabled={index === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => moveRole(index, 1)} disabled={index === roles.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => deleteRole(role)}>
                  <Trash className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {permissions.map((permission) => (
                  <Label key={permission} className="flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-800">
                    {permissionLabels[permission]}
                    <input
                      type="checkbox"
                      checked={role.permissions.includes(permission)}
                      onChange={() => togglePermission(role, permission)}
                    />
                  </Label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
