"use client";
import { useModal } from "@/hooks/use-modal-store";
import { Bot } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";

export const NavigationAi = () => {
  const {onOpen} = useModal();
  return (
    <div>
      <ActionTooltip
        side="right"
        align="center"
        label="AI Помощник"
      >
        <button onClick={() => onOpen("aiAssistant")}
          className="group flex items-center"
        >
          <div className="flex mx-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] transition-all overflow-hidden items-center justify-center bg-white dark:bg-neutral-700 group-hover:bg-emerald-500">
            <Bot
              className="group-hover:text-white transition text-emerald-500"
              size={25}
            />
          </div>
        </button>
      </ActionTooltip>
    </div>
  )
}
