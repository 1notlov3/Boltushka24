"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";

import { parseMessageFormatting } from "@/lib/message-formatting";
import { cn } from "@/lib/utils";
import { LinkPreviewCard } from "@/components/chat/link-preview-card";

interface MessageContentProps {
  content: string;
  deleted?: boolean;
  isUpdated?: boolean;
  mentionNames?: Record<string, string>;
}

const mentionPatternSource = "<@([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})>";

export const MessageContent = ({
  content,
  deleted,
  isUpdated,
  mentionNames = {},
}: MessageContentProps) => {
  const tokens = parseMessageFormatting(content);
  const firstLink = tokens.find((token) => token.type === "link");
  const firstUrl = firstLink?.type === "link" ? firstLink.href : undefined;

  const renderText = (text: string) => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    const mentionPattern = new RegExp(mentionPatternSource, "giu");

    let match = mentionPattern.exec(text);

    while (match) {
      if (match.index > lastIndex) {
        parts.push(<Fragment key={`${match.index}-text`}>{text.slice(lastIndex, match.index)}</Fragment>);
      }

      const memberId = match[1].toLowerCase();
      parts.push(
        <span
          key={`${memberId}-${match.index}`}
          className="rounded-sm bg-indigo-500/10 px-1 font-semibold text-indigo-600 dark:text-indigo-300"
        >
          @{mentionNames[memberId] ?? "участник"}
        </span>,
      );

      lastIndex = match.index + match[0].length;
      match = mentionPattern.exec(text);
    }

    if (lastIndex < text.length) {
      parts.push(<Fragment key="tail">{text.slice(lastIndex)}</Fragment>);
    }

    return parts.length ? parts : text;
  };

  return (
    <div>
      <div
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

          return <Fragment key={index}>{renderText(token.text)}</Fragment>;
        })}
        {isUpdated && !deleted && (
          <span className="text-[10px] mx-2 text-zinc-500 dark:text-zinc-400">
            (изменено)
          </span>
        )}
      </div>
      {!deleted && firstUrl && <LinkPreviewCard url={firstUrl} />}
    </div>
  );
};
