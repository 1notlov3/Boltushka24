"use client";

import { Compass, Home } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { ActionTooltip } from "@/components/action-tooltip";
import { useGlobalUnread } from "@/hooks/use-unread";
import { cn } from "@/lib/utils";

export const NavigationHome = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: unread } = useGlobalUnread();
  const active = pathname === "/home";
  const discoverActive = pathname === "/discover";
  const unreadCount = unread?.total ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <ActionTooltip side="right" align="center" label="Главная">
        <button
        onClick={() => router.push("/home")}
        className="group relative flex items-center focus:outline-none"
        aria-label="Главная"
      >
        <div className={cn(
          "absolute left-0 bg-primary rounded-r-full transition-all w-[4px]",
          !active && "group-hover:h-[20px] group-focus:h-[20px]",
          active ? "h-[36px]" : "h-[8px]",
        )} />
        <div className={cn(
          "relative group flex mx-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] group-focus:rounded-[16px] transition-all overflow-hidden items-center justify-center bg-white dark:bg-neutral-700 group-hover:bg-blue-500 group-focus:bg-blue-500 dark:group-hover:bg-emerald-500 dark:group-focus:bg-emerald-500",
          active && "bg-blue-500 text-white rounded-[16px] dark:bg-emerald-500",
        )}>
          <Home className={cn(
            "transition text-blue-500 dark:text-emerald-500 group-hover:text-white group-focus:text-white",
            active && "text-white dark:text-white",
          )} size={24} />
        </div>
        {unreadCount > 0 && !active && (
          <span className="absolute right-2 top-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-[#E3E5E8] dark:ring-[#1E1F22]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      </ActionTooltip>
      <ActionTooltip side="right" align="center" label="Каталог">
        <button
          onClick={() => router.push("/discover")}
          className="group relative flex items-center focus:outline-none"
          aria-label="Каталог"
        >
          <div className={cn(
            "absolute left-0 bg-primary rounded-r-full transition-all w-[4px]",
            !discoverActive && "group-hover:h-[20px] group-focus:h-[20px]",
            discoverActive ? "h-[36px]" : "h-[8px]",
          )} />
          <div className={cn(
            "relative group flex mx-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] group-focus:rounded-[16px] transition-all overflow-hidden items-center justify-center bg-white dark:bg-neutral-700 group-hover:bg-indigo-500 group-focus:bg-indigo-500",
            discoverActive && "bg-indigo-500 text-white rounded-[16px]",
          )}>
            <Compass className={cn(
              "transition text-indigo-500 group-hover:text-white group-focus:text-white",
              discoverActive && "text-white",
            )} size={24} />
          </div>
        </button>
      </ActionTooltip>
    </div>
  );
};
