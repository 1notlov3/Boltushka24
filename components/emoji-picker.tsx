"use client";

import { Smile } from "lucide-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EmojiPickerProps {
  onChange: (value: string) => void;
}

const EmojiPickerContent = dynamic(() => import("./emoji-picker-content"), {
  loading: () => <div className="h-[350px] w-full flex items-center justify-center text-zinc-500">Loading...</div>,
  ssr: false
});

export const EmojiPicker = ({
  onChange,
}: EmojiPickerProps) => {
  const { resolvedTheme } = useTheme();

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
        <EmojiPickerContent
          theme={resolvedTheme}
          onChange={onChange}
        />
      </PopoverContent>
    </Popover>
  )
}
