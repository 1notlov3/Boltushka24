import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ConversationParticipantRole, ConversationType, MemberRole } from "@prisma/client";

const loadEnvFile = (path: string) => {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(["'])(.*)\1$/, "$2");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

async function main() {
  loadEnvFile(resolve(process.cwd(), ".env"));
  loadEnvFile(resolve(process.cwd(), ".env.local"));

  const messageFormatting = await import("../lib/message-formatting");
  const permissions = await import("../lib/permissions");
  const reactionTrigger = await import("../lib/reaction-trigger");
  const typingIndicator = await import("../hooks/use-typing-indicator");
  const youtube = await import("../lib/youtube");
  const groupConversationUi = await import("../lib/group-conversation-ui");

  const {
    applySlashCommand,
    parseMarkdownTable,
    parseMessageFormatting,
    parsePollCommand,
    parseQuoteContent,
    parseTodoContent,
  } = messageFormatting;
  const { canDeleteMessage, canEditMessage, hasPermission } = permissions;
  const { movedBeyondReactionTolerance, REACTION_LONG_PRESS_MS, shouldIgnoreReactionTrigger } = reactionTrigger;
  const { removeTypingUser, TYPING_TTL, upsertTypingUser } = typingIndicator;
  const { extractYoutubeId } = youtube;
  const {
    buildCreateGroupConversationPayload,
    buildGroupSettingsPayload,
    canManageGroupConversation,
    canRemoveGroupParticipant,
    canSubmitGroupConversation,
    canSubmitGroupSettings,
    groupConversationHref,
  } = groupConversationUi;

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
  assert.equal(ConversationType.DIRECT, "DIRECT");
  assert.equal(ConversationType.GROUP, "GROUP");
  assert.equal(ConversationParticipantRole.OWNER, "OWNER");
  assert.equal(ConversationParticipantRole.ADMIN, "ADMIN");
  assert.equal(ConversationParticipantRole.MEMBER, "MEMBER");

  const groupPayload = buildCreateGroupConversationPayload({
    serverId: "server-1",
    name: "  Запуск   продукта  ",
    imageUrl: "   ",
    selectedMemberIds: ["member-1", "owner-1", "member-1", "member-2"],
    currentMemberId: "owner-1",
  });
  assert.deepEqual(groupPayload, {
    serverId: "server-1",
    name: "Запуск продукта",
    imageUrl: null,
    memberIds: ["member-1", "member-2"],
  });
  assert.equal(canSubmitGroupConversation(groupPayload), true);
  assert.equal(canSubmitGroupConversation({ ...groupPayload, memberIds: ["member-1"] }), false);
  assert.equal(groupConversationHref("server-1", "conversation-1"), "/servers/server-1/conversations/group/conversation-1");

  const groupSettingsPayload = buildGroupSettingsPayload({ name: "  Новый   штаб  ", imageUrl: " https://example.com/a.png " });
  assert.deepEqual(groupSettingsPayload, { name: "Новый штаб", imageUrl: "https://example.com/a.png" });
  assert.equal(canSubmitGroupSettings(groupSettingsPayload), true);
  assert.equal(canSubmitGroupSettings({ ...groupSettingsPayload, name: "" }), false);
  assert.equal(canManageGroupConversation("OWNER"), true);
  assert.equal(canManageGroupConversation("ADMIN"), true);
  assert.equal(canManageGroupConversation("MEMBER"), false);
  assert.equal(canRemoveGroupParticipant({ actorRole: "ADMIN", targetRole: "MEMBER", isSelf: false, ownerCount: 1 }), true);
  assert.equal(canRemoveGroupParticipant({ actorRole: "MEMBER", targetRole: "MEMBER", isSelf: false, ownerCount: 1 }), false);
  assert.equal(canRemoveGroupParticipant({ actorRole: "OWNER", targetRole: "OWNER", isSelf: true, ownerCount: 1 }), false);
  assert.equal(canRemoveGroupParticipant({ actorRole: "OWNER", targetRole: "MEMBER", isSelf: true, ownerCount: 1 }), true);

  const modalStoreSource = readFileSync(resolve(process.cwd(), "hooks/use-modal-store.ts"), "utf8");
  const modalProviderSource = readFileSync(resolve(process.cwd(), "components/providers/modal-provider.tsx"), "utf8");
  const modalSource = readFileSync(resolve(process.cwd(), "components/modals/create-group-conversation-modal.tsx"), "utf8");
  const groupSettingsModalSource = readFileSync(resolve(process.cwd(), "components/modals/group-conversation-settings-modal.tsx"), "utf8");
  const chatHeaderActionsSource = readFileSync(resolve(process.cwd(), "components/chat/chat-header-actions.tsx"), "utf8");
  assert.equal(modalStoreSource.includes('"createGroupConversation"'), true);
  assert.equal(modalStoreSource.includes('"groupConversationSettings"'), true);
  assert.equal(modalProviderSource.includes("CreateGroupConversationModal"), true);
  assert.equal(modalProviderSource.includes("GroupConversationSettingsModal"), true);
  assert.equal(modalSource.includes('http.post("/api/conversations/group", payload)'), true);
  assert.equal(modalSource.includes("payload.memberIds.length"), true);
  assert.equal(modalSource.includes("groupConversationHref(serverId, data.conversation.id)"), true);
  assert.equal(groupSettingsModalSource.includes("/api/conversations/group/${conversationId}/participants"), true);
  assert.equal(chatHeaderActionsSource.includes('onOpen("groupConversationSettings"'), true);
  assert.equal(chatHeaderActionsSource.includes("isGroupConversation"), true);

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

  console.log("All unit checks passed");
}

void main();
