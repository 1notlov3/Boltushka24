"use client";

import { Member, MemberRole, Profile } from "@prisma/client";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";

interface ServerMemberProps {
  member: Member & { profile: Profile };
}

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />,
  [MemberRole.ADMIN]: <ShieldAlert className="h-4 w-4 ml-2 text-rose-500" />
}

const statusClassName: Record<string, string> = {
  ONLINE: "bg-emerald-500",
  IDLE: "bg-amber-500",
  DND: "bg-rose-500",
  INVISIBLE: "bg-zinc-500",
  OFFLINE: "bg-zinc-500",
};

export const ServerMember = ({
  member,
}: ServerMemberProps) => {
  const params = useParams();
  const router = useRouter();

  const icon = roleIconMap[member.role];

  const onClick = () => {
    router.push(`/servers/${params?.serverId}/conversations/${member.id}`)
  }

  return (
    <button
    onClick={onClick}
      className={cn(
        "group px-3 py-2.5 sm:py-2 rounded-md flex items-center gap-x-3 sm:gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
        params?.memberId === member.id && "bg-zinc-700/20 dark:bg-zinc-700"
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar
          src={member.profile.imageUrl}
          className="h-9 w-9 md:h-8 md:w-8"
        />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#F2F3F5] dark:border-[#2B2D31]",
            statusClassName[member.profile.status] ?? statusClassName.OFFLINE
          )}
        />
      </div>
      <div className="min-w-0 text-left">
        <p
          className={cn(
            "truncate font-semibold text-base sm:text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
            params?.memberId === member.id && "text-primary dark:text-zinc-200 dark:group-hover:text-white"
          )}
        >
          {member.profile.name}
        </p>
        {member.profile.customStatus && (
          <p className="truncate text-[11px] text-zinc-400">{member.profile.customStatus}</p>
        )}
      </div>
      {icon}
    </button>
  )
}
