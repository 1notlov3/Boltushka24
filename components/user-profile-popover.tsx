"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MemberRole, UserStatus } from "@prisma/client";
import {
  Crown,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { http } from "@/lib/http";
import { useMemberPresence } from "@/components/providers/server-activity-provider";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type RoleTag = {
  id: string;
  name: string;
  color: string;
};

type MemberProfileData = {
  id: string;
  role: MemberRole;
  joinedAt: string;
  profile: {
    id: string;
    name: string;
    imageUrl: string;
    status: UserStatus;
    customStatus: string | null;
    lastSeenAt: string | null;
    createdAt: string;
  };
  roles: RoleTag[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const statusConfig: Record<
  string,
  { className: string; label: string }
> = {
  ONLINE: { className: "bg-emerald-500", label: "В сети" },
  IDLE: { className: "bg-amber-500", label: "Неактивен" },
  DND: { className: "bg-rose-500", label: "Не беспокоить" },
  INVISIBLE: { className: "bg-zinc-400", label: "Невидимый" },
  OFFLINE: { className: "bg-zinc-400", label: "Не в сети" },
};

const roleIconMap: Record<MemberRole, React.ReactNode> = {
  GUEST: null,
  MODERATOR: <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />,
  ADMIN: <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />,
};

const roleLabelMap: Record<MemberRole, string> = {
  GUEST: "Участник",
  MODERATOR: "Модератор",
  ADMIN: "Администратор",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLastSeen(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;
  if (days < 7) return `${days} дн. назад`;
  return formatDate(dateStr);
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface UserProfilePopoverProps {
  memberId: string;
  serverId: string;
  /** Fallback data shown instantly while full profile loads */
  fallbackName: string;
  fallbackImageUrl: string;
  fallbackRole: MemberRole;
  currentMemberId: string;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  align?: "start" | "center" | "end";
}

export function UserProfilePopover({
  memberId,
  serverId,
  fallbackName,
  fallbackImageUrl,
  fallbackRole,
  currentMemberId,
  children,
  side = "right",
  align = "start",
}: UserProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<MemberProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const presence = useMemberPresence(memberId);

  const isSelf = memberId === currentMemberId;

  const fetchProfile = useCallback(async () => {
    if (profile?.id === memberId) return;
    setLoading(true);
    try {
      const { data } = await http.get<MemberProfileData>(
        `/api/members/${memberId}/profile?serverId=${serverId}`
      );
      setProfile(data);
    } catch (err) {
      console.error("[USER_PROFILE_POPOVER]", err);
    } finally {
      setLoading(false);
    }
  }, [memberId, serverId, profile?.id]);

  useEffect(() => {
    if (open) {
      void fetchProfile();
    }
  }, [open, fetchProfile]);

  const navigateToConversation = () => {
    setOpen(false);
    router.push(`/servers/${params?.serverId}/conversations/${memberId}`);
  };

  /* Resolved values — prefer live presence, then fetched profile, then fallback */
  const resolvedStatus =
    presence?.status ?? profile?.profile.status ?? UserStatus.OFFLINE;
  const resolvedName = profile?.profile.name ?? fallbackName;
  const resolvedImage = profile?.profile.imageUrl ?? fallbackImageUrl;
  const resolvedRole = profile?.role ?? fallbackRole;
  const resolvedCustomStatus = profile?.profile.customStatus ?? null;
  const resolvedLastSeen = profile?.profile.lastSeenAt ?? null;
  const resolvedRoles = profile?.roles ?? [];
  const { className: statusDotClass, label: statusLabel } =
    statusConfig[resolvedStatus] ?? statusConfig.OFFLINE;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-72 overflow-hidden rounded-xl border-0 bg-white p-0 shadow-xl dark:bg-[#232428]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        data-reaction-ignore
      >
        {/* Banner / header gradient */}
        <div className="relative h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400">
          {/* Avatar – overlapping the banner */}
          <div className="absolute -bottom-8 left-4">
            <div className="relative">
              <UserAvatar
                src={resolvedImage}
                className="h-16 w-16 rounded-full border-[3px] border-white shadow-md dark:border-[#232428]"
              />
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-4 w-4 rounded-full border-[2.5px] border-white dark:border-[#232428]",
                  statusDotClass
                )}
                title={statusLabel}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pb-4 pt-11">
          {/* Name + system role */}
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-bold text-zinc-900 dark:text-white">
              {resolvedName}
            </h3>
            {roleIconMap[resolvedRole]}
          </div>

          {/* System role label */}
          <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {roleLabelMap[resolvedRole]}
          </p>

          {/* Custom status */}
          {resolvedCustomStatus && (
            <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400 italic">
              {resolvedCustomStatus}
            </p>
          )}

          {/* Online status / last seen */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span
              className={cn("inline-block h-2 w-2 rounded-full", statusDotClass)}
            />
            {resolvedStatus === "ONLINE" || resolvedStatus === "IDLE" || resolvedStatus === "DND"
              ? statusLabel
              : resolvedLastSeen
                ? `Был(а) ${formatLastSeen(resolvedLastSeen)}`
                : statusLabel}
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Custom server roles */}
          {resolvedRoles.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Роли
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resolvedRoles.map((role) => (
                  <span
                    key={role.id}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      borderColor: role.color,
                      color: role.color,
                      backgroundColor: `${role.color}15`,
                    }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    {role.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-1.5">
            {profile?.joinedAt && (
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">На сервере с</span>
                <span>{formatDate(profile.joinedAt)}</span>
              </div>
            )}
            {profile?.profile.createdAt && (
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">В Boltushka24 с</span>
                <span>{formatDate(profile.profile.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Message button (don't show for self) */}
          {!isSelf && (
            <Button
              onClick={navigateToConversation}
              size="sm"
              className="mt-3 w-full gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700"
            >
              <MessageCircle className="h-4 w-4" />
              Написать сообщение
            </Button>
          )}

          {/* Loading indicator */}
          {loading && !profile && (
            <div className="mt-2 flex justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-500" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
