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
      className="hover:opacity-75 transition mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
      title="Совместный просмотр YouTube"
      aria-label="Совместный просмотр YouTube"
    >
      <Airplay className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
    </button>
  );
};
