"use client";

import { Loader2, Smile } from "lucide-react";
import dynamic from "next/dynamic";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ActionTooltip } from "@/components/action-tooltip";

interface EmojiPickerProps {
  onChange: (value: string) => void;
}

// Lazy load emoji picker to reduce initial bundle size
const EmojiPickerWrapper = dynamic(() => import("./emoji-picker-wrapper"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-[435px]">
      <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
    </div>
  )
});

export const EmojiPicker = ({
  onChange,
}: EmojiPickerProps) => {
  return (
    <Popover>
      <ActionTooltip label="Добавить эмодзи" side="right">
        <PopoverTrigger aria-label="Добавить эмодзи">
          <Smile
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
          />
        </PopoverTrigger>
      </ActionTooltip>
      <PopoverContent
        side="right"
        sideOffset={40}
        className="bg-transparent border-none shadow-none drop-shadow-none mb-16"
      >
        <EmojiPickerWrapper onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
