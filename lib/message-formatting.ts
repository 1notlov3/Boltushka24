export type MessageToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "inlineCode"; text: string }
  | { type: "codeBlock"; text: string }
  | { type: "link"; text: string; href: string };

const tokenPattern =
  /```([\s\S]*?)```|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|(https?:\/\/[^\s<>"']+)/g;

export function parseMessageFormatting(content: string): MessageToken[] {
  const tokens: MessageToken[] = [];
  let lastIndex = 0;

  tokenPattern.lastIndex = 0;
  let match = tokenPattern.exec(content);

  while (match) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      tokens.push({ type: "codeBlock", text: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ type: "inlineCode", text: match[2] });
    } else if (match[3] !== undefined) {
      tokens.push({ type: "bold", text: match[3] });
    } else if (match[4] !== undefined) {
      tokens.push({ type: "italic", text: match[4] });
    } else if (match[5] !== undefined) {
      tokens.push({ type: "link", text: match[5], href: match[5] });
    }

    lastIndex = match.index + match[0].length;
    match = tokenPattern.exec(content);
  }

  if (lastIndex < content.length) {
    tokens.push({ type: "text", text: content.slice(lastIndex) });
  }

  return tokens.length ? tokens : [{ type: "text", text: content }];
}

export function applySlashCommand(raw: string) {
  const value = raw.trim();

  if (value === "/shrug") {
    return "¯\\_(ツ)_/¯";
  }

  if (value.startsWith("/me ")) {
    return `_${value.slice(4).trim()}_`;
  }

  if (value.startsWith("/poll ")) {
    return `**Опрос:** ${value.slice(6).trim()}`;
  }

  if (value.startsWith("/gif")) {
    const query = value.slice(4).trim();
    return query ? `[GIF: ${query}]` : "[GIF]";
  }

  if (value === "/help") {
    return "Команды: /shrug, /me текст, /poll вопрос, /gif запрос, /help";
  }

  return raw;
}

export function extractMentionNames(content: string) {
  return Array.from(new Set(content.match(/@[\p{L}\p{N}_.-]+/gu)?.map((item) => item.slice(1)) ?? []));
}
