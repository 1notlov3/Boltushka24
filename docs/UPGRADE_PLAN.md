# План production-upgrade

## Что уже работает

- Next.js App Router с Clerk-аутентификацией, Prisma и Supabase Realtime/Storage.
- Серверы, каналы, DM, роли ADMIN/MODERATOR/GUEST, invite links, LiveKit-комнаты и YouTube watch-together.
- Базовая Zod-валидация в части API, signal-only realtime для сообщений и optimistic insert в input.
- Мобильный drawer, `100dvh`, safe-area padding и крупные touch-targets в основном chat flow.

## Найденные слабые места

- Права доступа проверяются прямо в route handlers и дублируются, поэтому легко получить рассинхрон между API.
- Prisma-схема не покрывает реакции, ответы, закрепления, избранное, настройки, уведомления, категории каналов и audit log.
- Messages API возвращает только базовые поля, поэтому любые новые функции чата требуют N+1 или отдельных fetch без общего контракта.
- Realtime корректно не рассылает содержимое сообщений, но нет typing presence и точечной модели событий для новых действий.
- UI чата не имеет reply state, pinned/search panels, saved state, lightweight markdown и draft restore.
- Документация описывает часть уже сделанных оптимизаций, но не фиксирует новые API, env fallback и production notes.

## Что добавляем в текущем пакете

- Расширение Prisma: reactions, pinned/replies/saved, notifications, user settings/status, channel categories, read states, server roles и audit log.
- Централизованные helpers для permissions, API responses, rate limiting, безопасного форматирования сообщений и YouTube URL parsing.
- Защищённые API routes для reactions, pin/unpin, save/remove, search, pinned list, saved list, notifications, settings и channel categories.
- Обновление chat UI: быстрые реакции, reply preview, pinned/saved actions, search/pinned/saved/settings/notifications modals, typing indicator и drafts.
- Sidebar grouping по категориям каналов без удаления старого деления на TEXT/AUDIO/VIDEO.
- Минимальные unit tests для permissions, YouTube parser и message formatting.

## UX, безопасность и производительность

- Все новые routes должны проверять auth, membership/conversation access, role permissions и валидировать вход через Zod.
- Для частых actions добавляется in-memory rate limit с production note про Redis/Upstash.
- Message queries расширяются через `include/select` одним запросом на страницу, чтобы реакции/parent/saved state приходили с сообщением.
- Supabase Realtime остаётся signal-only для persisted chat events; typing передаёт только member id/name и не содержит текст сообщения.

## База данных

Проект использует `prisma db push` в README, поэтому миграционная папка не создаётся. После применения схемы нужно выполнить:

```bash
npm run prisma:generate
npm run prisma:push
```

`prisma/local-schema.prisma` выглядит как старый невалидный introspection-артефакт MySQL и не участвует в production schema.

## Проверки готовности

- `npm install`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

Если build падает без runtime env, секреты не хардкодим: добавляем graceful fallback и документацию.
