"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";
import { useServerUnread } from "@/hooks/use-unread";

interface NavigationItemProps {
  id: string;
  imageUrl?: string | null;
  name: string;
};

export const NavigationItem = ({
  id,
  imageUrl,
  name
}: NavigationItemProps) => {
  const params = useParams();
  const router = useRouter();
  const { data: unread } = useServerUnread(id);
  const unreadCount = unread?.total ?? 0;
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  const onClick = () => {
    router.push(`/servers/${id}`);
  }

  return (
    <ActionTooltip
      side="right"
      align="center"
      label={name}
    >
      <button
        onClick={onClick}
        className="group relative flex items-center focus:outline-none"
        aria-label={name}
      >
        <div className={cn(
          "absolute left-0 bg-primary rounded-r-full transition-all w-[4px]",
          params?.serverId !== id && "group-hover:h-[20px] group-focus:h-[20px]",
          params?.serverId === id ? "h-[36px]" : "h-[8px]"
        )} />
        <div className={cn(
          "relative group flex mx-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] group-focus:rounded-[16px] transition-all overflow-hidden items-center justify-center",
          params?.serverId === id && "bg-primary/10 text-primary rounded-[16px]"
        )}>
          {imageUrl ? (
            <Image
              fill
              src={imageUrl}
              alt=""
            />
          ) : (
            <span className="text-lg font-extrabold">
              {(name || "?").trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>
        {unreadCount > 0 && params?.serverId !== id && (
          <span className="absolute right-2 top-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-[#E3E5E8] dark:ring-[#1E1F22]">
            {unreadLabel}
          </span>
        )}
      </button>
    </ActionTooltip>
  )
}
