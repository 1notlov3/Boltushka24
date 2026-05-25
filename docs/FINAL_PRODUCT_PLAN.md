# Boltushka24 Final Product Plan

> Цель: превратить Boltushka24 в готовый, сильный, production-ready communication hub, который объединяет лучшее из Telegram, Discord и развлекательных социальных платформ.

## Принцип работы агентной команды

Основная сессия работает как product owner и orchestrator. Под каждую фазу подключаются временные агенты:

- Product strategist: формирует ценность, retention loops, приоритеты.
- System architect: проверяет масштабирование, realtime, БД, безопасность.
- Frontend UX engineer: интерфейс, mobile-first, polish, accessibility.
- Backend engineer: API, Prisma, permissions, rate limits, data integrity.
- QA/reviewer: тесты, регрессии, build/lint/typecheck, security review.

Агенты нанимаются под конкретную задачу через `delegate_task`. Если агент дает слабый результат, он не используется повторно для этой линии работ; задача уходит другому агенту с более точным контекстом.

## Текущее состояние

Проект уже имеет сильное ядро:

- Next.js 16, React 19, TypeScript.
- Clerk auth.
- Prisma + PostgreSQL/Supabase.
- Supabase Realtime signal-only события.
- Серверы, каналы, категории.
- DM 1-на-1.
- Reactions, replies, threads, pinned/saved messages.
- Voice/video через LiveKit.
- YouTube watch rooms.
- Notifications, push, PWA/offline outbox.
- Roles, permissions, audit, slow mode, rate limits.

Baseline проверен локально:

- `npm run typecheck` проходит.
- `npm run lint` проходит.
- `npm test` проходит.
- `npm run build` проходит.

## North Star

Boltushka24 должен стать не просто клоном Discord/Telegram, а центром общения и развлечений:

1. Быстрый мессенджер для личного общения.
2. Community servers как в Discord, но проще и мобильнее.
3. Развлекательные комнаты: watch parties, activity rooms, mini games.
4. Социальная механика: профили, достижения, XP, streaks, quests.
5. Платформа для роста: публичные серверы, discovery, invite landing.
6. Безопасность: модерация, reports, AutoMod, audit UI.
7. Production hardening: observability, env validation, secure defaults, CI.

## Эпики

### Epic 1: Home Inbox

Цель: сделать приложение ежедневным мессенджером, а не только server UI.

Фичи:

- Единая домашняя страница со всеми важными диалогами.
- Быстрые карточки: unread, mentions, saved, watch rooms, active voice.
- Pinned/favorite chats.
- Empty states и onboarding.
- Быстрые действия: создать сервер, найти сервер, начать DM.

### Epic 2: Group DMs

Цель: закрыть главный пробел Telegram-like общения.

Фичи:

- Many-to-many Conversation model.
- Group DM name/avatar.
- Add/remove/leave participants.
- Group DM unread/read states.
- Notifications and mentions.
- Group calls.

### Epic 3: Entertainment Pack

Цель: дать fun factor и retention.

Фичи:

- Custom emoji per server.
- Sticker packs.
- Achievements/badges.
- XP за meaningful activity.
- Weekly quests.
- Reaction-triggered micro animations.

### Epic 4: Watch Together 2.0

Цель: превратить watch rooms в killer feature.

Фичи:

- Host/co-host roles.
- Queue voting.
- Scheduled watch parties.
- Watch history.
- Reactions over playback.
- Activity presence.

### Epic 5: Voice/Video Productization

Цель: сделать LiveKit UX готовым к реальному использованию.

Фичи:

- Pre-join screen.
- Screen share controls.
- Stage channels.
- Voice activity indicators in sidebar.
- Mobile call controls.
- Connection quality indicator.

### Epic 6: Discovery and Growth

Цель: дать продукту органический рост.

Фичи:

- Public/private server mode.
- Server directory.
- Tags/categories/interests.
- Invite landing pages.
- Featured communities.
- Onboarding by interests.

### Epic 7: Moderation and Safety

Цель: подготовить публичные сообщества.

Фичи:

- Kick/ban/mute/timeout.
- Reports.
- Moderation queue.
- AutoMod rules.
- Channel-level permissions.
- Role hierarchy.
- Audit log UI.

### Epic 8: Production Hardening

Цель: надежный деплой и обслуживание.

Фичи:

- Strict env validation.
- Vercel env sync documentation.
- Error boundaries and Sentry path.
- CI gates.
- API contract tests.
- Security headers.
- Rate limit coverage.

## Первая итерация

Первая итерация должна быть мощной, но безопасной: без рискованной миграции БД.

Выбор: **Home Command Center**.

Почему:

- Не ломает существующую модель данных.
- Сразу делает продукт более цельным.
- Хорошо показывает направление: мессенджер + развлечения + community hub.
- Можно проверить build без реальных production secrets.

Состав первой итерации:

1. Обновить landing/home experience.
2. Добавить блоки продукта: Communication, Entertainment, Safety, Growth.
3. Добавить roadmap preview для будущих фич.
4. Добавить developer/product documentation.
5. Подготовить основу для следующих задач.

## Definition of Done для каждой итерации

Перед коммитом обязательно:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- Проверка `git diff`
- Conventional commit

## Следующие конкретные задачи после первой итерации

1. Env validation: добавить `lib/env.ts` с zod-схемой и безопасными ошибками.
2. Home Inbox MVP: новая страница/компоненты с реальными данными unread/global.
3. Group DM design doc + Prisma migration plan.
4. Entertainment Pack 1: achievements schema and UI.
5. Watch Together 2.0: queue voting and host controls.
6. Discovery MVP: public server mode and directory.
7. Moderation MVP: timeout/report API and mod queue UI.
