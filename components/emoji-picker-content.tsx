"use client";

import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface EmojiPickerContentProps {
  onChange: (value: string) => void;
  theme?: string;
}

const EmojiPickerContent = ({
  onChange,
  theme,
}: EmojiPickerContentProps) => {
  return (
    <Picker
      theme={theme}
      data={data}
      onEmojiSelect={(emoji: any) => onChange(emoji.native)}
    />
  );
}

export default EmojiPickerContent;
