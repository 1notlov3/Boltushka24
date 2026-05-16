"use client";

import { Button } from "@/components/ui/button";

interface EmojiPickerWrapperProps {
  onChange: (value: string) => void;
}

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😎", "😢",
  "😡", "👍", "👎", "👏", "🙏", "🔥", "🎉", "❤️",
  "💯", "✅", "❌", "👀", "🤔", "😴", "🚀", "⭐",
];

const EmojiPickerWrapper = ({ onChange }: EmojiPickerWrapperProps) => {
  return (
    <div className="grid w-64 grid-cols-6 gap-1 rounded-md border bg-white p-2 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {EMOJIS.map((emoji) => (
        <Button
          key={emoji}
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-lg"
          onClick={() => onChange(emoji)}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
};

export default EmojiPickerWrapper;
