<div align="center">

# 💬 Болтушка 24

**Современный мессенджер-платформа с серверами, голосовыми каналами, прямыми сообщениями и совместным просмотром YouTube**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Realtime%20%7C%20Storage-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)](https://clerk.com/)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-FF4200)](https://livekit.io/)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/1notlov3/Boltushka24)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

🔗 **Production:** [boltushka24.vercel.app](https://boltushka24.vercel.app)

![Демо Болтушка24](docs/assets/demo.gif)

</div>

---

## 📖 О проекте

**Болтушка 24** — full-stack мессенджер, вдохновлённый Discord и Telegram. Создавайте сообщества-серверы, текстовые и голосовые каналы, общайтесь в DM, совершайте видеозвонки и смотрите YouTube синхронно с друзьями.

Всё приложение полностью локализовано на **русский язык** — от интерфейса авторизации до модальных окон.

## ✨ Возможности

### 💬 Общение
- **Серверы-сообщества** с ролями `ADMIN`, `MODERATOR`, `GUEST` и приглашениями по ссылке
- **Текстовые каналы** с Markdown-подобными сообщениями, эмодзи и вложениями
- **Прямые сообщения** (1-на-1 Conversations) между участниками одного сервера
- **Мгновенная оптимистичная отправка** — сообщение появляется в UI до ответа сервера
- **Редактирование и удаление** сообщений с визуальными индикаторами
- **Realtime** на базе Supabase Realtime (signal-only broadcast + authenticated refetch)

### 🎙️ Голос и видео
- **Голосовые каналы** — WebRTC через [LiveKit](https://livekit.io/)
- **Видеозвонки в DM** — кнопка старта видеосессии прямо из чата
- **Комната совместного просмотра YouTube** — синхронизация play/pause/seek между всеми участниками канала

### 🏆 Рейтинг и активность
- **Лидерборд сервера** с прозрачной формулой расчёта рейтинга
- Учёт сообщений в каналах (1.0x) + DM (1.2x) + бонус за активность последних 30 дней (0.6x / 0.9x)

### 📱 Мобильный UX
- **Адаптивный дизайн** с viewport-units `100dvh` (корректно работает с iOS Safari)
- **Drawer-навигация** — выезжающая панель серверов/каналов на мобильных
- **Крупные touch-таргеты** (≥44×44px), safe-area-inset-bottom, отсутствие page-level скролла
- **True optimistic updates** — сообщения отображаются до ответа сервера даже на медленных соединениях

### 🔒 Безопасность и инфраструктура
- **Clerk** — аутентификация (email + magic link, OAuth-провайдеры, 2FA)
- **Supabase RLS** — изоляция данных между пользователями на уровне БД
- **Signal-only Realtime** — через публичный канал транслируется только `{id, action}`, контент фетчится через аутентифицированный API
- **Prisma** — типобезопасный ORM с композитными индексами для чата

---

## 🖼️ Скриншоты

<table>
  <tr>
    <td align="center" width="33%">
      <img src="docs/assets/desktop-chat.png" alt="Десктоп: канал и чат" />
      <br/><sub><b>Десктоп</b> · Канал с сообщениями</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/assets/mobile-chat.png" alt="Мобильный: чат" width="260" />
      <br/><sub><b>Мобильный</b> · Чат-интерфейс</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/assets/mobile-drawer.png" alt="Мобильный: drawer-меню" width="260" />
      <br/><sub><b>Мобильный</b> · Drawer с серверами</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="3">
      <img src="docs/assets/mobile-settings.png" alt="Мобильное меню профиля" width="260" />
      <br/><sub><b>Мобильный</b> · Меню профиля (Настройки аккаунта + Выход)</sub>
    </td>
  </tr>
</table>

📽️ **Видео-демо:** [`docs/assets/demo.mp4`](docs/assets/demo.mp4) (полноценная демонстрация всех мобильных фиксов)

---

## 🧱 Технологический стек

| Слой | Технологии |
|------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI, shadcn/ui |
| **Auth** | Clerk (русская локализация `@clerk/localizations/ruRU`) |
| **База данных** | PostgreSQL (Supabase), Prisma 5 |
| **Realtime** | Supabase Realtime (broadcast + presence) |
| **Файлы** | Supabase Storage (аватары, вложения) |
| **WebRTC** | LiveKit (голос, видео) |
| **State** | TanStack Query (React Query), Zustand |
| **Формы** | React Hook Form + Zod |
| **Хостинг** | Vercel (Edge + Node runtime) |

---

## 🏗️ Архитектура

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js 14 (Vercel)                   │
│  ┌────────────────┐  ┌─────────────────┐  ┌───────────┐  │
│  │  App Router    │  │  API Routes     │  │ Pages API │  │
│  │  (RSC + Client)│  │  (Server Comp.) │  │ (socket)  │  │
│  └───────┬────────┘  └────────┬────────┘  └─────┬─────┘  │
└──────────┼────────────────────┼─────────────────┼────────┘
           │                    │                 │
     ┌─────▼──────┐      ┌──────▼──────┐   ┌──────▼──────┐
     │   Clerk    │      │   Supabase  │   │   LiveKit   │
     │   (Auth)   │      │  ┌────────┐ │   │   (WebRTC)  │
     └────────────┘      │  │Postgres│ │   └─────────────┘
                         │  │Storage │ │
                         │  │Realtime│ │
                         │  └────────┘ │
                         └─────────────┘
```

**Ключевые паттерны:**

- **RSC-first** — страницы — Server Components, клиентские обёртки только где нужны обработчики событий
- **Signal-only Realtime** — `broadcast({ id, action })` → `queryClient.invalidateQueries` → authenticated refetch через API. Публичный канал не утекает содержимое DM
- **Optimistic temp-id** — клиент вставляет сообщение с `temp-<timestamp>-<random>` до `POST`, заменяет real-id после ответа, откатывает на ошибке

---

## 🚀 Быстрый старт

### Требования
- Node.js 18+ или 20+
- pnpm / npm / yarn
- Аккаунты: [Clerk](https://clerk.com/), [Supabase](https://supabase.com/), [LiveKit](https://livekit.io/) (Free tier везде)

### 1. Клонирование и установка

```bash
git clone https://github.com/1notlov3/Boltushka24.git
cd Boltushka24
pnpm install
```

### 2. Переменные окружения

Создай файл `.env` в корне проекта:

```env
# Supabase (Postgres + Storage + Realtime)
DATABASE_URL="postgresql://postgres.xxx:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx"
SUPABASE_SECRET_KEY="sb_secret_xxx"

# Clerk (Auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# LiveKit (Voice / Video)
LIVEKIT_API_KEY="APIxxx"
LIVEKIT_API_SECRET="secret_xxx"
NEXT_PUBLIC_LIVEKIT_URL="wss://xxx.livekit.cloud"
```

### 3. Миграции БД и Storage bucket

```bash
# Сгенерировать Prisma клиент и залить схему
pnpm prisma generate
pnpm prisma db push

# В Supabase Dashboard → Storage → New bucket:
#   name: uploads, public: true
```

### 4. Запуск

```bash
pnpm dev           # http://localhost:3000
pnpm build         # production-сборка
pnpm lint          # eslint проверка
```

---

## 📂 Структура проекта

```
Boltushka24/
├── app/
│   ├── (auth)/             # Clerk sign-in / sign-up (русская локализация)
│   ├── (invite)/           # Страница приглашения по коду
│   ├── (main)/
│   │   └── (routes)/servers/[serverId]/
│   │       ├── channels/[channelId]/       # Текстовый канал
│   │       │   └── watch/                  # Совместный YouTube
│   │       └── conversations/[memberId]/   # Прямое сообщение 1:1
│   ├── api/                # App Router API (channels, members, ratings, servers)
│   └── setup/              # Создание первого сервера
├── components/
│   ├── chat/               # Chat header, messages, input, items
│   ├── modals/             # Create server, invite, edit, rating modals
│   ├── navigation/         # Navigation sidebar (левая колонка серверов)
│   ├── server/             # Server sidebar, channels, members
│   ├── watch/              # YouTube Watch-Together room
│   ├── ui/                 # shadcn/ui примитивы
│   ├── mobile-toggle.tsx         # Мобильный гамбургер
│   └── mobile-sheet-content.tsx  # Client-wrapper для SheetContent (RSC-граница)
├── lib/
│   ├── db.ts                  # Prisma singleton
│   ├── supabase.ts            # Supabase клиенты (browser + admin)
│   ├── realtime.ts            # Realtime каналы + signal-only broadcast
│   ├── current-profile.ts     # Получение профиля из Clerk в RSC
│   └── initial-profile.ts     # Создание Profile при первом логине
├── prisma/
│   └── schema.prisma          # Модели: Profile, Server, Member, Channel, Message, Conversation, DirectMessage
└── pages/api/socket/          # Legacy Pages API (сообщения, DM, watch)
```

---

## 🗄️ Модель данных

```
Profile 1:N Server     (владелец серверов)
Profile 1:N Member     (участник множества серверов)
Server 1:N Channel     (каналы внутри сервера: TEXT / AUDIO / VIDEO)
Server 1:N Member      (участники сервера с ролями)
Channel 1:N Message    (сообщения в канале)
Member 1:N Message     (автор сообщения)
Member M:N Conversation (DM между двумя участниками)
Conversation 1:N DirectMessage
```

Композитные индексы: `Message(channelId, createdAt)`, `DirectMessage(conversationId, createdAt)` для быстрой пагинации чата.

---

## 📡 Деплой на Vercel

1. Fork репозитория
2. Создай проект в [Vercel](https://vercel.com/new), привяжи GitHub
3. Добавь все env-переменные из раздела [Быстрый старт](#-быстрый-старт) во вкладке **Environment Variables**
4. Deploy — Vercel автоматически запустит `pnpm build` и задеплоит

После деплоя:
- В **Clerk Dashboard** → Paths → добавь домен Vercel в `signInUrl`
- В **Supabase Dashboard** → Authentication → URL Configuration → добавь домен как Site URL
- В **LiveKit Cloud** → Project → Settings → добавь домен в CORS origins

---

## 🗺️ Roadmap

- [ ] **Push-уведомления** (Web Push API)
- [ ] **Темизация каналов** (категории, цвета, иконки)
- [ ] **Threads** — ветки обсуждений внутри сообщений
- [ ] **Бот API** — вебхуки для интеграций
- [ ] **Screen sharing** в голосовых каналах (LiveKit уже поддерживает)
- [ ] **Stickers и GIF-picker** через Giphy/Tenor
- [ ] **E2E-шифрование DM** (через libsodium)
- [ ] **PWA** — установка как приложение, offline-first

---

## 🤝 Разработка

### Workflow
- Основная ветка: `master` (всегда деплоится на прод)
- Feature-ветки: `devin/<timestamp>-<name>` или `feat/<name>`
- PR обязателен — CI прогоняет lint + typecheck + build

### Команды
```bash
pnpm dev              # dev-сервер
pnpm build            # production build
pnpm lint             # ESLint
pnpm prisma studio    # GUI для БД
pnpm prisma migrate dev --name <name>  # новая миграция
```

### История ключевых релизов

| PR | Описание |
|----|----------|
| [#293](https://github.com/1notlov3/Boltushka24/pull/293) | Миграция с MySQL на Supabase (Postgres + Storage + Realtime) |
| [#295](https://github.com/1notlov3/Boltushka24/pull/295) | Закрытие утечки DM на публичных Realtime-каналах |
| [#296](https://github.com/1notlov3/Boltushka24/pull/296) | Optimistic chat + мобильный редизайн |
| [#297](https://github.com/1notlov3/Boltushka24/pull/297) | iOS viewport, focus-ring, drawer auto-tooltip, settings, true optimistic |
| [#298](https://github.com/1notlov3/Boltushka24/pull/298) | Исправление SSR-крэша (RSC-граница) |

---

## 📝 Лицензия

[MIT](LICENSE) © 1notlov3

---

<div align="center">

Если проект оказался полезен — поставь ⭐ на GitHub!

Made with ❤️ in Russia

</div>
