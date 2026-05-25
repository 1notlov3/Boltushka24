"use client";

import { Airplay } from "lucide-react";

import { useModal } from "@/hooks/use-modal-store";

interface WatchTogetherTriggerProps {
  serverId: string;
  channelId: string;
}

export const WatchTogetherTrigger = ({ serverId, channelId }: WatchTogetherTriggerProps) => {
  const { onOpen } = useModal();

  return (
    <button
      onClick={() => onOpen("watchTogether", { query: { serverId, channelId } })}
      className="rounded-md p-2 transition hover:bg-zinc-100 hover:opacity-75 dark:hover:bg-zinc-800 sm:mr-1"
      title="Совместный просмотр YouTube"
      aria-label="Совместный просмотр YouTube"
    >
      <Airplay className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
    </button>
  );
};
