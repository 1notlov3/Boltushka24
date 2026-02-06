"use client";

import { useTheme } from "next-themes";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface EmojiPickerWrapperProps {
  onChange: (value: string) => void;
}

const EmojiPickerWrapper = ({ onChange }: EmojiPickerWrapperProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Picker
      theme={resolvedTheme}
      data={data}
      onEmojiSelect={(emoji: any) => onChange(emoji.native)}
    />
  );
};

export default EmojiPickerWrapper;
