"use client";

import { MessageCirclePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HomeInboxServer } from "@/lib/home-inbox";
import { useModal } from "@/hooks/use-modal-store";

export const HomeInboxGroupAction = ({ servers }: { servers: HomeInboxServer[] }) => {
  const { onOpen } = useModal();
  const defaultServerId = servers[0]?.id;

  if (!defaultServerId) return null;

  return (
    <Button
      variant="outline"
      onClick={() => onOpen("createGroupConversation", { serverId: defaultServerId })}
      className="shrink-0 rounded-2xl dark:border-white/10 dark:bg-white/5 dark:text-white"
    >
      <MessageCirclePlus className="mr-2 h-4 w-4" />
      Групповой чат
    </Button>
  );
};
