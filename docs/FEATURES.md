# Возможности

## Чат

- Reactions для channel messages и DM с optimistic UI.
- Replies с preview и переходом к оригиналу, если сообщение загружено в текущей странице.
- Pinned messages для автора, ADMIN и MODERATOR.
- Saved messages, доступные из меню пользователя.
- Search внутри канала или DM.
- Drafts в `localStorage` per chat.
- Slash commands: `/shrug`, `/me`, `/poll`, `/gif`, `/help`.
- Markdown-lite: bold, italic, inline code, code block, links.
- Typing indicators через Supabase Realtime broadcast без передачи текста.

## Серверы и каналы

- Channel categories с API и sidebar grouping.
- Channel topic/category в create/edit modal.
- Централизованная permission matrix поверх ADMIN/MODERATOR/GUEST.
- Audit log для создания/обновления категорий и каналов.

## Пользователь

- User settings: theme, language placeholder, compact mode, notification/sound toggles.
- Presence/status: online, idle, dnd, invisible, offline, custom status.
- Notification center: replies, mentions, reactions, pins, DM.

## Медиа

- LiveKit остаётся runtime-only integration с graceful API error при отсутствии env.
- YouTube URL parser вынесен в `lib/youtube.ts` и покрыт unit checks.
