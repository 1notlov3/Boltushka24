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
      className="hover:opacity-75 transition mr-2"
      title="Совместный просмотр YouTube"
    >
      <Airplay className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
    </button>
  );
};
