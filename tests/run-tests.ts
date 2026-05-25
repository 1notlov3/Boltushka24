import assert from "node:assert/strict";
import { MemberRole } from "@prisma/client";

import { applySlashCommand, parseMessageFormatting, parsePollCommand } from "../lib/message-formatting";
import { canDeleteMessage, canEditMessage, hasPermission } from "../lib/permissions";
import { extractYoutubeId } from "../lib/youtube";

const videoId = "dQw4w9WgXcQ";

assert.equal(extractYoutubeId(videoId), videoId);
assert.equal(extractYoutubeId(`https://www.youtube.com/watch?v=${videoId}&t=10`), videoId);
assert.equal(extractYoutubeId(`https://youtu.be/${videoId}`), videoId);
assert.equal(extractYoutubeId("https://example.com/nope"), null);

assert.equal(applySlashCommand("/me тестирует"), "_тестирует_");
assert.equal(applySlashCommand("/poll лучший канал?"), "/poll лучший канал?");
assert.equal(applySlashCommand("/gif cats"), "[GIF: cats]");
assert.equal(applySlashCommand("/todo проверить деплой"), "☐ проверить деплой");
assert.equal(applySlashCommand("/quote важная мысль"), "> важная мысль");
assert.equal(applySlashCommand("/code const ok = true;"), "```\nconst ok = true;\n```");
assert.equal(applySlashCommand("/table").includes("| Колонка 1 | Колонка 2 |"), true);

const poll = parsePollCommand('/poll "Лучший канал?" "общий" "музыка"');
assert.equal(poll?.question, "Лучший канал?");
assert.equal(poll?.options.length, 2);
assert.equal(poll?.options[0]?.id, "option-1");

const tokens = parseMessageFormatting("Привет **мир** `code` https://example.com");
assert.equal(tokens.some((token) => token.type === "bold" && token.text === "мир"), true);
assert.equal(tokens.some((token) => token.type === "inlineCode" && token.text === "code"), true);
assert.equal(tokens.some((token) => token.type === "link" && token.href === "https://example.com"), true);

assert.equal(hasPermission(MemberRole.ADMIN, "server.manage"), true);
assert.equal(hasPermission(MemberRole.MODERATOR, "channel.manage"), true);
assert.equal(hasPermission(MemberRole.GUEST, "channel.manage"), false);
assert.equal(canDeleteMessage({ id: "m1", role: MemberRole.GUEST }, "m1"), true);
assert.equal(canDeleteMessage({ id: "m2", role: MemberRole.MODERATOR }, "m1"), true);
assert.equal(canEditMessage({ id: "m2", role: MemberRole.MODERATOR }, "m1"), false);

console.log("All unit checks passed");
