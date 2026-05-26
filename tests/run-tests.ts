import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MemberRole } from "@prisma/client";

import {
  applySlashCommand,
  parseMarkdownTable,
  parseMessageFormatting,
  parsePollCommand,
  parseQuoteContent,
  parseTodoContent,
} from "../lib/message-formatting";
import { canDeleteMessage, canEditMessage, hasPermission } from "../lib/permissions";
import { movedBeyondReactionTolerance, REACTION_LONG_PRESS_MS, shouldIgnoreReactionTrigger } from "../lib/reaction-trigger";
import { removeTypingUser, TYPING_TTL, upsertTypingUser } from "../hooks/use-typing-indicator";
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

const tokens = parseMessageFormatting("Привет **мир** `code` _идёт_ https://example.com");
assert.equal(tokens.some((token) => token.type === "bold" && token.text === "мир"), true);
assert.equal(tokens.some((token) => token.type === "inlineCode" && token.text === "code"), true);
assert.equal(tokens.some((token) => token.type === "italic" && token.text === "идёт"), true);
assert.equal(tokens.some((token) => token.type === "link" && token.href === "https://example.com"), true);

const table = parseMarkdownTable("| A | B |\n| --- | --- |\n| 1 | 2 |");
assert.deepEqual(table?.headers, ["A", "B"]);
assert.deepEqual(table?.rows, [["1", "2"]]);
assert.equal(parseMarkdownTable("| A | B |\n| no | divider |"), null);
assert.deepEqual(parseQuoteContent("> первая\n> вторая"), ["первая", "вторая"]);
assert.equal(parseQuoteContent("не цитата"), null);
assert.deepEqual(parseTodoContent("☐ проверить"), { checked: false, text: "проверить" });
assert.deepEqual(parseTodoContent("☑ готово"), { checked: true, text: "готово" });

assert.equal(hasPermission(MemberRole.ADMIN, "server.manage"), true);
assert.equal(hasPermission(MemberRole.MODERATOR, "channel.manage"), true);
assert.equal(hasPermission(MemberRole.GUEST, "channel.manage"), false);
assert.equal(canDeleteMessage({ id: "m1", role: MemberRole.GUEST }, "m1"), true);
assert.equal(canDeleteMessage({ id: "m2", role: MemberRole.MODERATOR }, "m1"), true);
assert.equal(canEditMessage({ id: "m2", role: MemberRole.MODERATOR }, "m1"), false);

assert.equal(REACTION_LONG_PRESS_MS, 500);
assert.equal(movedBeyondReactionTolerance({ x: 10, y: 10 }, { x: 18, y: 17 }), false);
assert.equal(movedBeyondReactionTolerance({ x: 10, y: 10 }, { x: 25, y: 10 }), true);
assert.equal(shouldIgnoreReactionTrigger(null), false);
assert.equal(TYPING_TTL, 3500);
const typingUsers = upsertTypingUser([], { memberId: "m1", name: "Первый" });
assert.deepEqual(upsertTypingUser(typingUsers, { memberId: "m1", name: "Первый обновлён" }), [
  { memberId: "m1", name: "Первый обновлён" },
]);
assert.deepEqual(removeTypingUser(typingUsers, "m1"), []);

const rootDir = join(__dirname, "..");
const createServerModalSource = readFileSync(join(rootDir, "components/modals/create-server-modal.tsx"), "utf8");
assert.equal(createServerModalSource.includes("router.push(`/servers/${serverId}`)"), true);
assert.equal(createServerModalSource.includes("onClose();"), true);
assert.equal(createServerModalSource.includes("toast.error"), true);
assert.equal(createServerModalSource.includes("pb-[max(env(safe-area-inset-bottom),1rem)]"), true);

const setupPageSource = readFileSync(join(rootDir, "app/setup/page.tsx"), "utf8");
assert.equal(setupPageSource.includes("CreateServerButton"), true);
assert.equal(setupPageSource.includes("href: \"create-server\""), true);
assert.equal(setupPageSource.includes("href=\"/setup\">Создать первый сервер"), false);

const homeInboxSource = readFileSync(join(rootDir, "components/home/home-inbox.tsx"), "utf8");
assert.equal(homeInboxSource.includes("CreateServerButton"), true);
assert.equal(homeInboxSource.includes("href=\"/setup\"><Plus"), false);

const inputSource = readFileSync(join(rootDir, "components/ui/input.tsx"), "utf8");
assert.equal(inputSource.includes("text-base sm:text-sm"), true);

const mobileBarSource = readFileSync(join(rootDir, "components/main-mobile-bar.tsx"), "utf8");
assert.equal(mobileBarSource.includes('pathname?.startsWith("/servers/")'), true);
assert.equal(mobileBarSource.includes("return null"), true);

console.log("All unit checks passed");
