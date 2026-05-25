"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  buildCreateGroupConversationPayload,
  canSubmitGroupConversation,
  groupConversationHref,
  MIN_GROUP_OTHER_MEMBERS,
  type CreateGroupMemberOption,
} from "@/lib/group-conversation-ui";
import { cn } from "@/lib/utils";

type MemberOptionsResponse = {
  currentMemberId: string;
  members: CreateGroupMemberOption[];
};

type GroupConversationResponse = {
  conversation: {
    id: string;
  };
};

const MemberAvatar = ({ member }: { member: CreateGroupMemberOption }) => (
  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-sm font-bold text-zinc-700 dark:bg-white/10 dark:text-white">
    {member.imageUrl ? (
      <Image src={member.imageUrl} alt="" fill className="object-cover" />
    ) : (
      <span>{member.name.trim().charAt(0).toUpperCase() || "?"}</span>
    )}
  </div>
);

export const CreateGroupConversationModal = () => {
  const router = useRouter();
  const params = useParams();
  const { isOpen, type, data, onClose } = useModal();
  const isModalOpen = isOpen && type === "createGroupConversation";
  const serverId = data.serverId ?? (typeof params?.serverId === "string" ? params.serverId : undefined);

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<CreateGroupMemberOption[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(() => buildCreateGroupConversationPayload({
    serverId: serverId ?? "",
    name,
    imageUrl,
    selectedMemberIds,
    currentMemberId,
  }), [currentMemberId, imageUrl, name, selectedMemberIds, serverId]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return members;

    return members.filter((member) => member.name.toLowerCase().includes(normalizedQuery));
  }, [members, query]);

  useEffect(() => {
    if (!isModalOpen || !serverId) return;

    let cancelled = false;

    const loadMembers = async () => {
      setIsLoadingMembers(true);
      setError(null);

      try {
        const response = await fetch(`/api/server-members/group-options?serverId=${serverId}`);
        if (!response.ok) throw new Error("members-load-failed");

        const payload = await response.json() as MemberOptionsResponse;
        if (cancelled) return;

        setCurrentMemberId(payload.currentMemberId);
        setMembers(payload.members);
      } catch (error) {
        if (!cancelled) {
          setError("Не удалось загрузить участников. Попробуйте ещё раз.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMembers(false);
        }
      }
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [isModalOpen, serverId]);

  const reset = () => {
    setName("");
    setImageUrl("");
    setQuery("");
    setMembers([]);
    setCurrentMemberId(null);
    setSelectedMemberIds([]);
    setError(null);
    setIsSubmitting(false);
    setIsLoadingMembers(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((current) => (
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    ));
  };

  const canSubmit = canSubmitGroupConversation(payload) && !isSubmitting && !isLoadingMembers;

  const onSubmit = async () => {
    if (!serverId) {
      setError("Сначала откройте сервер, где нужно создать чат.");
      return;
    }

    if (!canSubmitGroupConversation(payload)) {
      setError(`Выберите минимум ${MIN_GROUP_OTHER_MEMBERS} участников и задайте название.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await http.post("/api/conversations/group", payload);
      const data = response.data as GroupConversationResponse;

      router.push(groupConversationHref(serverId, data.conversation.id));
      router.refresh();
      handleClose();
    } catch (error) {
      setError("Не удалось создать групповой чат. Проверьте участников и попробуйте ещё раз.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white p-0 text-black dark:bg-zinc-900 dark:text-zinc-100 sm:max-w-xl">
        <DialogHeader className="px-6 pt-6">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
            <Users className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-2xl font-black">
            Создать групповой чат
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 pb-2">
          <div className="space-y-2">
            <Label htmlFor="group-name" className="text-xs font-bold uppercase text-zinc-500">
              Название
            </Label>
            <Input
              id="group-name"
              disabled={isSubmitting}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например: Команда запуска"
              maxLength={120}
              className="border-0 bg-zinc-100 text-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-white/10 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-image" className="text-xs font-bold uppercase text-zinc-500">
              Картинка, необязательно
            </Label>
            <Input
              id="group-image"
              disabled={isSubmitting}
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              className="border-0 bg-zinc-100 text-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-white/10 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="group-member-search" className="text-xs font-bold uppercase text-zinc-500">
                Участники
              </Label>
              <span className="text-xs font-semibold text-zinc-500">
                Выбрано: {payload.memberIds.length}
              </span>
            </div>
            <Input
              id="group-member-search"
              disabled={isSubmitting || isLoadingMembers}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти участника"
              className="border-0 bg-zinc-100 text-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-white/10 dark:text-white"
            />
            <ScrollArea className="h-56 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-white/10 dark:bg-white/[0.03]">
              {isLoadingMembers ? (
                <div className="p-4 text-center text-sm text-zinc-500">Загружаю участников...</div>
              ) : filteredMembers.length > 0 ? (
                <div className="space-y-1">
                  {filteredMembers.map((member) => {
                    const selected = payload.memberIds.includes(member.id);

                    return (
                      <button
                        key={member.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => toggleMember(member.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl p-2 text-left transition",
                          selected
                            ? "bg-blue-500 text-white"
                            : "hover:bg-zinc-200 dark:hover:bg-white/10",
                        )}
                      >
                        <MemberAvatar member={member} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{member.name}</p>
                          <p className={cn("text-xs", selected ? "text-blue-100" : "text-zinc-500")}>{member.role ?? "MEMBER"}</p>
                        </div>
                        <span className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black",
                          selected ? "border-white bg-white text-blue-600" : "border-zinc-300",
                        )}>
                          {selected ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-zinc-500">
                  {members.length === 0 ? "В этом сервере пока нет других участников." : "Ничего не найдено."}
                </div>
              )}
            </ScrollArea>
            <p className="text-xs text-zinc-500">
              Для группы нужны вы и минимум {MIN_GROUP_OTHER_MEMBERS} других участника.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="bg-zinc-100 px-6 py-4 dark:bg-black/20">
          <Button disabled={isSubmitting} variant="ghost" onClick={handleClose} className="rounded-2xl">
            Отмена
          </Button>
          <Button disabled={!canSubmit} variant="primary" onClick={onSubmit} className="rounded-2xl">
            {isSubmitting ? "Создаю..." : "Создать чат"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
