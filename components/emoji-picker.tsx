"use client";

import { Smile } from "lucide-react";
import dynamic from "next/dynamic";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EmojiPickerProps {
  onChange: (value: string) => void;
}

// Lazy load emoji picker to reduce initial bundle size
const EmojiPickerWrapper = dynamic(() => import("./emoji-picker-wrapper"), {
  ssr: false,
  loading: () => <p>Loading...</p>
});

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
        <EmojiPickerWrapper onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
