"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";

import {
  parseMarkdownTable,
  parseMessageFormatting,
  parseQuoteContent,
  parseTodoContent,
  type MessageToken,
} from "@/lib/message-formatting";
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
  const table = deleted ? null : parseMarkdownTable(content);
  const quoteLines = deleted ? null : parseQuoteContent(content);
  const todo = deleted ? null : parseTodoContent(content);

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

  const renderTokens = (items: MessageToken[]) => items.map((token, index) => {
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
  });

  const editedLabel = isUpdated && !deleted && (
    <span className="text-[10px] mx-2 text-zinc-500 dark:text-zinc-400">
      (изменено)
    </span>
  );

  if (table) {
    return (
      <div>
        <div className="my-2 max-w-full overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <table className="min-w-full text-left text-sm text-zinc-700 dark:text-zinc-200">
            <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                {table.headers.map((header, index) => (
                  <th key={`${header}-${index}`} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-zinc-200 dark:border-zinc-800">
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top">
                      {renderTokens(parseMessageFormatting(cell))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editedLabel}
      </div>
    );
  }

  if (quoteLines) {
    return (
      <div>
        <blockquote className="my-2 border-l-4 border-indigo-400 bg-indigo-500/5 px-3 py-2 text-base leading-snug text-zinc-700 dark:text-zinc-200 sm:text-sm">
          {quoteLines.map((line, index) => (
            <p key={index}>{renderTokens(parseMessageFormatting(line))}</p>
          ))}
        </blockquote>
        {editedLabel}
        {!deleted && firstUrl && <LinkPreviewCard url={firstUrl} />}
      </div>
    );
  }

  if (todo) {
    return (
      <div>
        <div className="my-1 inline-flex max-w-full items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 sm:text-sm">
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold",
              todo.checked
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-zinc-300 bg-white text-transparent dark:border-zinc-600 dark:bg-zinc-800"
            )}
            aria-hidden="true"
          >
            ✓
          </span>
          <span className={cn("min-w-0 break-words", todo.checked && "line-through opacity-70")}>
            {renderTokens(parseMessageFormatting(todo.text))}
          </span>
        </div>
        {editedLabel}
        {!deleted && firstUrl && <LinkPreviewCard url={firstUrl} />}
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn(
          "text-base sm:text-sm text-zinc-700 dark:text-zinc-200 leading-snug break-words whitespace-pre-wrap",
          deleted && "italic text-zinc-500 dark:text-zinc-400 text-xs mt-1"
        )}
      >
        {renderTokens(tokens)}
        {editedLabel}
      </div>
      {!deleted && firstUrl && <LinkPreviewCard url={firstUrl} />}
    </div>
  );
};
