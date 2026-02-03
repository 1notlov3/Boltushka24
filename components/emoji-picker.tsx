"use client";

import { Smile } from "lucide-react";
import dynamic from "next/dynamic";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EmojiPickerContent = dynamic(() => import("./emoji-picker-content"), {
  loading: () => <div className="w-[352px] h-[435px] bg-zinc-200/20 rounded-md animate-pulse" />,
  ssr: false
});

interface EmojiPickerProps {
  onChange: (value: string) => void;
}

export const EmojiPicker = ({
  onChange,
}: EmojiPickerProps) => {
  return (
    <Popover>
      <PopoverTrigger aria-label="Добавить эмодзи">
        <Smile
          className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
        />
      </PopoverTrigger>
      <PopoverContent 
        side="right" 
        sideOffset={40}
        className="bg-transparent border-none shadow-none drop-shadow-none mb-16"
      >
        <EmojiPickerContent onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
