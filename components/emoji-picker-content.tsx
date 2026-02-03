"use client";

import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "next-themes";

interface EmojiPickerContentProps {
  onChange: (value: string) => void;
}

const EmojiPickerContent = ({
  onChange,
}: EmojiPickerContentProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Picker
      theme={resolvedTheme}
      data={data}
      onEmojiSelect={(emoji: any) => onChange(emoji.native)}
    />
  );
}

export default EmojiPickerContent;
