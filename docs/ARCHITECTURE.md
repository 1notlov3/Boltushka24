# Архитектура Болтушка 24

## Слои

- `app/` содержит App Router страницы и route handlers.
- `pages/api/socket/` оставлен для совместимости с текущим chat write flow.
- `components/chat/` отвечает за optimistic UI, realtime invalidation, replies, reactions, pinned/saved actions и typing.
- `lib/permissions.ts` централизует права поверх `MemberRole`.
- `lib/chat-includes.ts` задаёт единый Prisma contract для сообщений.
- `lib/realtime.ts` отправляет только signal payload без приватного текста сообщений.

## Данные

Основные модели: `Profile`, `Server`, `Member`, `Channel`, `Message`, `Conversation`, `DirectMessage`.

Расширения upgrade-пакета:

- `MessageReaction`, `DirectMessageReaction`
- `SavedMessage`, `SavedDirectMessage`
- `Notification`
- `UserSettings`
- `ChannelCategory`
- `ChannelReadState`, `ConversationReadState`
- `ServerRole`, `AuditLog`

## Realtime

Persistent chat-события используют signal-only broadcast:

- `chat:{chatId}:messages`
- `chat:{chatId}:messages:update`

Typing indicators используют отдельный ephemeral topic `typing:{chatId}` и не передают содержимое input.

## Безопасность

Новые API handlers:

- получают текущий профиль на сервере;
- сами находят `Member` через `profileId`;
- проверяют membership/conversation access;
- валидируют вход через Zod;
- используют role helpers из `lib/permissions.ts`.

DM-контент не отправляется в публичный realtime payload.
