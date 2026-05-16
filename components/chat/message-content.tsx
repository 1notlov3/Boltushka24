"use client";

import { Fragment } from "react";

import { parseMessageFormatting } from "@/lib/message-formatting";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  content: string;
  deleted?: boolean;
  isUpdated?: boolean;
}

export const MessageContent = ({
  content,
  deleted,
  isUpdated,
}: MessageContentProps) => {
  const tokens = parseMessageFormatting(content);

  return (
    <p
      className={cn(
        "text-base sm:text-sm text-zinc-700 dark:text-zinc-200 leading-snug break-words whitespace-pre-wrap",
        deleted && "italic text-zinc-500 dark:text-zinc-400 text-xs mt-1"
      )}
    >
      {tokens.map((token, index) => {
        if (token.type === "bold") {
          return <strong key={index}>{token.text}</strong>;
        }

        if (token.type === "italic") {
          return <em key={index}>{token.text}</em>;
        }

        if (token.type === "inlineCode") {
          return (
            <code key={index} className="rounded bg-zinc-200 px-1 py-0.5 text-[0.85em] dark:bg-zinc-800">
              {token.text}
            </code>
          );
        }

        if (token.type === "codeBlock") {
          return (
            <pre key={index} className="my-2 max-w-full overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
              <code>{token.text}</code>
            </pre>
          );
        }

        if (token.type === "link") {
          return (
            <a
              key={index}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:underline"
            >
              {token.text}
            </a>
          );
        }

        return <Fragment key={index}>{token.text}</Fragment>;
      })}
      {isUpdated && !deleted && (
        <span className="text-[10px] mx-2 text-zinc-500 dark:text-zinc-400">
          (изменено)
        </span>
      )}
    </p>
  );
};
