export type MessageToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "inlineCode"; text: string }
  | { type: "codeBlock"; text: string }
  | { type: "link"; text: string; href: string };

export type ParsedPollCommand = {
  question: string;
  options: { id: string; text: string }[];
  multiple: boolean;
};

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

  if (value.startsWith("/gif")) {
    const query = value.slice(4).trim();
    return query ? `[GIF: ${query}]` : "[GIF]";
  }

  if (value === "/help") {
    return "Команды: /shrug, /me текст, /poll вопрос, /gif запрос, /help";
  }

  return raw;
}

export function parseGifCommand(raw: string) {
  const value = raw.trim();
  if (!value.startsWith("/gif")) return null;

  return value.slice(4).trim() || null;
}

export function parsePollCommand(raw: string): ParsedPollCommand | null {
  const value = raw.trim();
  if (!value.startsWith("/poll ")) return null;

  const body = value.slice(6).trim();
  const multiple = body.startsWith("--multi ") || body.startsWith("--multiple ");
  const normalizedBody = multiple ? body.replace(/^--multi(?:ple)?\s+/, "") : body;
  const quoted = Array.from(normalizedBody.matchAll(/"([^"]+)"/g), (match) => match[1].trim())
    .filter(Boolean);

  if (quoted.length >= 3) {
    const [question, ...choices] = quoted;
    return {
      question,
      options: choices.slice(0, 8).map((text, index) => ({ id: `option-${index + 1}`, text })),
      multiple,
    };
  }

  const pipeParts = normalizedBody.split("|").map((part) => part.trim()).filter(Boolean);
  if (pipeParts.length >= 3) {
    const [question, ...choices] = pipeParts;
    return {
      question,
      options: choices.slice(0, 8).map((text, index) => ({ id: `option-${index + 1}`, text })),
      multiple,
    };
  }

  return null;
}

export function extractMentionNames(content: string) {
  return Array.from(new Set(content.match(/@[\p{L}\p{N}_.-]+/gu)?.map((item) => item.slice(1)) ?? []));
}

export function extractMentionMemberIds(content: string) {
  return Array.from(
    new Set(
      content.match(/<@[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}>/giu)
        ?.map((item) => item.slice(2, -1).toLowerCase()) ?? [],
    ),
  );
}
