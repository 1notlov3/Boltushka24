"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, LogOut, MoreVertical, ShieldCheck, ShieldMinus, UserMinus, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { http } from "@/lib/http";
import { useModal } from "@/hooks/use-modal-store";
import {
  buildGroupSettingsPayload,
  canDemoteGroupParticipant,
  canManageGroupConversation,
  canPromoteGroupParticipant,
  canRemoveGroupParticipant,
  canSubmitGroupSettings,
  canTransferGroupOwnership,
  type CreateGroupMemberOption,
  type GroupConversationRole,
} from "@/lib/group-conversation-ui";
import { cn } from "@/lib/utils";

type GroupParticipant = {
  id: string;
  memberId: string;
  role: GroupConversationRole;
  member: {
    id: string;
    role: string;
    profile: {
      id: string;
      name: string;
      imageUrl: string;
      status?: string | null;
      customStatus?: string | null;
    };
  };
};

type GroupSettingsResponse = {
  conversation: {
    id: string;
    serverId: string;
    name: string | null;
    imageUrl: string | null;
    ownerId: string | null;
  };
  currentMemberId: string;
  currentRole: GroupConversationRole;
  participants: GroupParticipant[];
};

type CandidateResponse = {
  members: CreateGroupMemberOption[];
};

const roleLabel = (role: GroupConversationRole) => {
  switch (role) {
    case "OWNER":
      return "Владелец";
    case "ADMIN":
      return "Админ";
    default:
      return "Участник";
  }
};

const Avatar = ({ imageUrl, name }: { imageUrl: string | null; name: string }) => (
  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-sm font-bold text-zinc-700 dark:bg-white/10 dark:text-white">
    {imageUrl ? (
      <Image src={imageUrl} alt="" fill className="object-cover" />
    ) : (
      <span>{name.trim().charAt(0).toUpperCase() || "?"}</span>
    )}
  </div>
);

export const GroupConversationSettingsModal = () => {
  const router = useRouter();
  const { isOpen, type, data, onClose } = useModal();
  const isModalOpen = isOpen && type === "groupConversationSettings";
  const conversationId = data.conversationId;
  const serverId = data.serverId;

  const [group, setGroup] = useState<GroupSettingsResponse | null>(null);
  const [candidates, setCandidates] = useState<CreateGroupMemberOption[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRole = group?.currentRole;
  const canManage = canManageGroupConversation(currentRole);
  const ownerCount = group?.participants.filter((participant) => participant.role === "OWNER").length ?? 0;
  const settingsPayload = buildGroupSettingsPayload({ name, imageUrl });
  const canSaveSettings = canManage && canSubmitGroupSettings(settingsPayload) && !isSaving;

  const filteredParticipants = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!group || !query) return group?.participants ?? [];

    return group.participants.filter((participant) => participant.member.profile.name.toLowerCase().includes(query));
  }, [group, memberQuery]);

  const filteredCandidates = useMemo(() => {
    const query = candidateQuery.trim().toLowerCase();
    if (!query) return candidates;

    return candidates.filter((candidate) => candidate.name.toLowerCase().includes(query));
  }, [candidateQuery, candidates]);

  const load = useCallback(async () => {
    if (!conversationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [settingsResponse, candidatesResponse] = await Promise.all([
        fetch(`/api/conversations/group/${conversationId}`),
        fetch(`/api/conversations/group/${conversationId}/participants`),
      ]);

      if (!settingsResponse.ok) throw new Error("settings-load-failed");
      const settings = await settingsResponse.json() as GroupSettingsResponse;
      setGroup(settings);
      setName(settings.conversation.name ?? "");
      setImageUrl(settings.conversation.imageUrl ?? "");

      if (candidatesResponse.ok) {
        const candidatePayload = await candidatesResponse.json() as CandidateResponse;
        setCandidates(candidatePayload.members);
      } else {
        setCandidates([]);
      }
    } catch (error) {
      setError("Не удалось загрузить настройки группы.");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isModalOpen) {
      void load();
    }
  }, [isModalOpen, load]);

  const reset = () => {
    setGroup(null);
    setCandidates([]);
    setSelectedMemberIds([]);
    setName("");
    setImageUrl("");
    setMemberQuery("");
    setCandidateQuery("");
    setIsLoading(false);
    setIsSaving(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleCandidate = (memberId: string) => {
    setSelectedMemberIds((current) => (
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    ));
  };

  const saveSettings = async () => {
    if (!conversationId || !canSaveSettings) return;

    setIsSaving(true);
    setError(null);

    try {
      await http.patch(`/api/conversations/group/${conversationId}`, settingsPayload);
      await load();
      router.refresh();
    } catch (error) {
      setError("Не удалось сохранить настройки группы.");
    } finally {
      setIsSaving(false);
    }
  };

  const addParticipants = async () => {
    if (!conversationId || selectedMemberIds.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      await http.post(`/api/conversations/group/${conversationId}/participants`, {
        memberIds: selectedMemberIds,
      });
      setSelectedMemberIds([]);
      await load();
      router.refresh();
    } catch (error) {
      setError("Не удалось добавить участников.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeParticipant = async (memberId: string) => {
    if (!conversationId || !group) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await http.delete(`/api/conversations/group/${conversationId}/participants/${memberId}`);
      const left = Boolean((response.data as { left?: boolean }).left);

      if (left && serverId) {
        handleClose();
        router.push(`/servers/${serverId}`);
        router.refresh();
        return;
      }

      await load();
      router.refresh();
    } catch (error) {
      setError("Не удалось удалить участника. Возможно, это последний владелец группы.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateParticipantRole = async (memberId: string, action: "promote" | "demote" | "transfer_owner") => {
    if (!conversationId || !group) return;

    setIsSaving(true);
    setError(null);

    try {
      await http.patch(`/api/conversations/group/${conversationId}/participants/${memberId}`, { action });
      await load();
      router.refresh();
    } catch (error) {
      setError(action === "transfer_owner"
        ? "Не удалось передать владение группой."
        : "Не удалось изменить роль участника.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white p-0 text-black dark:bg-zinc-900 dark:text-zinc-100 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
            <Users className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-2xl font-black">
            Настройки группы
          </DialogTitle>
          {group && (
            <p className="text-center text-sm text-zinc-500">
              {group.participants.length} участников · {roleLabel(group.currentRole)}
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[68dvh] px-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-zinc-500">Загружаю настройки...</div>
          ) : group ? (
            <div className="space-y-6 pb-6">
              <section className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black">Информация</h3>
                  {!canManage && <span className="text-xs text-zinc-500">Только owner/admin</span>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-settings-name" className="text-xs font-bold uppercase text-zinc-500">Название</Label>
                  <Input
                    id="group-settings-name"
                    disabled={!canManage || isSaving}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={120}
                    className="border-0 bg-zinc-100 text-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-white/10 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-settings-image" className="text-xs font-bold uppercase text-zinc-500">Картинка</Label>
                  <Input
                    id="group-settings-image"
                    disabled={!canManage || isSaving}
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://..."
                    className="border-0 bg-zinc-100 text-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-white/10 dark:text-white"
                  />
                </div>
                {canManage && (
                  <Button disabled={!canSaveSettings} onClick={saveSettings} variant="primary" className="rounded-2xl">
                    Сохранить
                  </Button>
                )}
              </section>

              <section className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black">Участники</h3>
                  <span className="text-xs text-zinc-500">{group.participants.length}</span>
                </div>
                <Input
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Найти в группе"
                  className="border-0 bg-zinc-100 text-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-white/10 dark:text-white"
                />
                <div className="space-y-2">
                  {filteredParticipants.map((participant) => {
                    const isSelf = participant.memberId === group.currentMemberId;
                    const removable = canRemoveGroupParticipant({
                      actorRole: group.currentRole,
                      targetRole: participant.role,
                      isSelf,
                      ownerCount,
                    });
                    const promotable = canPromoteGroupParticipant({ actorRole: group.currentRole, targetRole: participant.role, isSelf });
                    const demotable = canDemoteGroupParticipant({ actorRole: group.currentRole, targetRole: participant.role, isSelf });
                    const transferable = canTransferGroupOwnership({ actorRole: group.currentRole, targetRole: participant.role, isSelf });
                    const hasActions = removable || promotable || demotable || transferable;

                    return (
                      <div key={participant.memberId} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-2 dark:bg-white/[0.04]">
                        <Avatar imageUrl={participant.member.profile.imageUrl} name={participant.member.profile.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{participant.member.profile.name}{isSelf ? " · это вы" : ""}</p>
                          <p className="text-xs text-zinc-500">{roleLabel(participant.role)}</p>
                        </div>
                        {hasActions && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                disabled={isSaving}
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-zinc-500"
                                aria-label={`Параметры участника ${participant.member.profile.name}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {promotable && (
                                <DropdownMenuItem onSelect={() => updateParticipantRole(participant.memberId, "promote")}>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Сделать админом
                                </DropdownMenuItem>
                              )}
                              {demotable && (
                                <DropdownMenuItem onSelect={() => updateParticipantRole(participant.memberId, "demote")}>
                                  <ShieldMinus className="mr-2 h-4 w-4" />
                                  Снять админа
                                </DropdownMenuItem>
                              )}
                              {transferable && (
                                <DropdownMenuItem onSelect={() => updateParticipantRole(participant.memberId, "transfer_owner")}>
                                  <Crown className="mr-2 h-4 w-4" />
                                  Передать владение
                                </DropdownMenuItem>
                              )}
                              {(promotable || demotable || transferable) && removable && <DropdownMenuSeparator />}
                              {removable && (
                                <DropdownMenuItem
                                  onSelect={() => removeParticipant(participant.memberId)}
                                  className="text-rose-500"
                                >
                                  {isSelf ? <LogOut className="mr-2 h-4 w-4" /> : <UserMinus className="mr-2 h-4 w-4" />}
                                  {isSelf ? "Покинуть группу" : "Удалить из группы"}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {canManage && (
                <section className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black">Добавить людей</h3>
                    <span className="text-xs text-zinc-500">Выбрано: {selectedMemberIds.length}</span>
                  </div>
                  <Input
                    value={candidateQuery}
                    onChange={(event) => setCandidateQuery(event.target.value)}
                    placeholder="Найти участника сервера"
                    className="border-0 bg-zinc-100 text-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-white/10 dark:text-white"
                  />
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {filteredCandidates.length > 0 ? filteredCandidates.map((candidate) => {
                      const selected = selectedMemberIds.includes(candidate.id);

                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          disabled={isSaving}
                          onClick={() => toggleCandidate(candidate.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl p-2 text-left transition",
                            selected ? "bg-blue-500 text-white" : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/10",
                          )}
                        >
                          <Avatar imageUrl={candidate.imageUrl} name={candidate.name} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{candidate.name}</p>
                            <p className={cn("text-xs", selected ? "text-blue-100" : "text-zinc-500")}>{candidate.role ?? "MEMBER"}</p>
                          </div>
                          <span className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black",
                            selected ? "border-white bg-white text-blue-600" : "border-zinc-300",
                          )}>
                            {selected ? "✓" : ""}
                          </span>
                        </button>
                      );
                    }) : (
                      <div className="rounded-2xl bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:bg-white/[0.04]">
                        Некого добавить.
                      </div>
                    )}
                  </div>
                  <Button disabled={selectedMemberIds.length === 0 || isSaving} onClick={addParticipants} variant="primary" className="rounded-2xl">
                    <UserPlus className="mr-2 h-4 w-4" /> Добавить
                  </Button>
                </section>
              )}
            </div>
          ) : null}
        </ScrollArea>

        {error && (
          <div className="mx-6 mb-3 rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        <DialogFooter className="bg-zinc-100 px-6 py-4 dark:bg-black/20">
          <Button disabled={isSaving} variant="ghost" onClick={handleClose} className="rounded-2xl">
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
