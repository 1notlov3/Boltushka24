<div align="center">

# 💬 Boltushka24

**A full-stack community messenger with servers, realtime chat, voice channels, direct messages, user activity systems, and synchronized YouTube watch rooms.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Realtime%20%7C%20Storage-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)](https://clerk.com/)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-FF4200)](https://livekit.io/)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/1notlov3/Boltushka24)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

🔗 **Production:** [boltushka24.vercel.app](https://boltushka24.vercel.app)

![Boltushka24 demo](docs/assets/demo.gif)

</div>

---

## What is Boltushka24?

**Boltushka24** is my own full-stack messenger platform — basically a cozy, self-built “chat hub” inspired by Discord and Telegram, but focused on being lightweight, fast, mobile-friendly, and fun to use.

The project solves a real problem: most small communities need more than a basic group chat, but running a polished communication platform usually requires many separate tools for servers, channels, direct messages, voice rooms, file uploads, moderation, notifications, and activity tracking. Boltushka24 brings those pieces into one web app with a modern stack and a clean user experience.

It supports community servers, text channels, direct messages, realtime updates, voice/video communication, YouTube watch-together sessions, roles, permissions, leaderboards, notifications, mobile navigation, optimistic chat sending, and PWA/offline behavior.

---

## Core idea

Boltushka24 is built around the idea of a **server-based social space**:

1. A user signs in with Clerk.
2. They create or join a server using an invite link.
3. Inside a server, members can chat in channels, send DMs, use reactions, replies, pinned messages, saved messages, polls, GIFs, attachments, and slash commands.
4. Supabase Realtime sends lightweight signals when something changes.
5. The client refetches the actual content through authenticated API routes, which keeps private messages safer than broadcasting full message payloads publicly.
6. LiveKit powers voice and video rooms.
7. Prisma and PostgreSQL store the app state, roles, messages, reactions, notifications, watch sessions, and activity data.

---

## Why this project matters

This project was not just a UI experiment. It is a real engineering playground where I practiced building a production-style realtime application with authentication, database modeling, permissions, realtime events, media workflows, mobile UX, and deployment.

The hardest parts were:

- keeping realtime chat fast without leaking private message content;
- making optimistic sending feel instant even on slow networks;
- building a mobile layout that behaves correctly on iOS Safari;
- combining server communities, DMs, voice, video, watch rooms, and notifications in one structure;
- keeping permissions centralized so admin/moderator/guest behavior stays predictable.

---

## Features

### Messaging

- Community servers with invite links
- Server roles: `ADMIN`, `MODERATOR`, `GUEST`
- Text channels with realtime message updates
- Direct 1-on-1 messages between members
- Optimistic message sending with temporary client IDs
- Message editing and deletion
- Reactions, replies, pinned messages, and saved messages
- Search inside channels and direct messages
- Typing indicators and draft messages
- Markdown-lite rendering
- Slash commands: `/shrug`, `/me`, `/poll`, `/gif`, `/help`
- Polls, GIF support, and Open Graph link previews

### Voice, video, and watch rooms

- Voice channels powered by LiveKit
- Direct video calls
- YouTube watch-together rooms
- Synchronized play, pause, and seek state
- Watch room presence and queue logic

### Activity and personalization

- Server leaderboard with transparent scoring
- Rating based on channel messages, DM activity, and recent activity bonuses
- User status: online, idle, DND, invisible, custom status
- User settings: theme, compact mode, notifications, sounds
- Notification center for replies, mentions, reactions, pins, and DMs

### Mobile and PWA

- Responsive UI built for desktop and mobile
- iOS-friendly `100dvh` layout handling
- Mobile drawer navigation for servers and channels
- PWA manifest and install support
- Service worker and offline outbox
- Large touch targets and safe-area handling
- Global command palette with `Ctrl/Cmd + K`

### Security and infrastructure

- Clerk authentication
- Supabase PostgreSQL database
- Supabase Storage for avatars and attachments
- Supabase Realtime with signal-only broadcasts
- Prisma ORM with typed database access
- Centralized permissions in `lib/permissions.ts`
- Custom server roles with granular permissions
- Rate limiting for sensitive actions

---

## Tech stack

| Layer | Technologies |
|------|--------------|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Radix UI, shadcn/ui |
| Auth | Clerk |
| Database | PostgreSQL on Supabase, Prisma 5 |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Voice / Video | LiveKit WebRTC |
| State | TanStack Query, Zustand |
| Forms | React Hook Form, Zod |
| Deployment | Vercel |

---

## Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    Next.js 16 on Vercel                  │
│  ┌────────────────┐  ┌─────────────────┐  ┌───────────┐  │
│  │  App Router    │  │  API Routes     │  │ Pages API │  │
│  │  RSC + Client  │  │  Server Logic   │  │ Socket    │  │
│  └───────┬────────┘  └────────┬────────┘  └─────┬─────┘  │
└──────────┼────────────────────┼─────────────────┼────────┘
           │                    │                 │
     ┌─────▼──────┐      ┌──────▼──────┐   ┌──────▼──────┐
     │   Clerk    │      │   Supabase  │   │   LiveKit   │
     │   Auth     │      │ PostgreSQL  │   │   WebRTC    │
     └────────────┘      │ Storage     │   └─────────────┘
                         │ Realtime    │
                         └─────────────┘
```

### Key patterns

- **RSC-first structure:** server components by default, client wrappers only where interactive behavior is needed.
- **Signal-only realtime:** realtime events broadcast only `{ id, action }`; the client then performs an authenticated refetch.
- **Optimistic temp IDs:** messages appear instantly with temporary IDs and are replaced with real database IDs after the API response.
- **Centralized permissions:** role checks are handled in one layer instead of being duplicated across the app.

---

## Screenshots

<table>
  <tr>
    <td align="center" width="33%">
      <img src="docs/assets/desktop-chat.png" alt="Desktop chat" />
      <br/><sub><b>Desktop</b> · Channel chat</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/assets/mobile-chat.png" alt="Mobile chat" width="260" />
      <br/><sub><b>Mobile</b> · Chat interface</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/assets/mobile-drawer.png" alt="Mobile drawer" width="260" />
      <br/><sub><b>Mobile</b> · Server drawer</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="3">
      <img src="docs/assets/mobile-settings.png" alt="Mobile profile menu" width="260" />
      <br/><sub><b>Mobile</b> · Profile and settings menu</sub>
    </td>
  </tr>
</table>

📽️ **Video demo:** [`docs/assets/demo.mp4`](docs/assets/demo.mp4)

---

## Data model

```text
Profile 1:N Server
Profile 1:N Member
Server 1:N Channel
Server 1:N ChannelCategory
Server 1:N Member
Channel 1:N Message
Member 1:N Message
Member M:N Conversation
Conversation 1:N DirectMessage
Message 1:N MessageReaction / SavedMessage / Notification
DirectMessage 1:N DirectMessageReaction / SavedDirectMessage / Notification
```

Important indexes include `Message(channelId, createdAt)` and `DirectMessage(conversationId, createdAt)` for efficient chat pagination.

More details are available in:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/API.md`](docs/API.md)
- [`docs/FEATURES.md`](docs/FEATURES.md)

---

## Quick start

### Requirements

- Node.js 18+ or 20+
- pnpm, npm, or yarn
- Clerk account
- Supabase project
- LiveKit project

### 1. Clone and install

```bash
git clone https://github.com/1notlov3/Boltushka24.git
cd Boltushka24
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
# Supabase
DATABASE_URL="postgresql://postgres.xxx:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx"
SUPABASE_SECRET_KEY="sb_secret_xxx"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# LiveKit
LIVEKIT_API_KEY="APIxxx"
LIVEKIT_API_SECRET="secret_xxx"
NEXT_PUBLIC_LIVEKIT_URL="wss://xxx.livekit.cloud"

# Optional production hardening
UPSTASH_REDIS_REST_URL="https://example.upstash.io"
UPSTASH_REDIS_REST_TOKEN="upstash_token"
SENTRY_DSN=""
NEXT_PUBLIC_SENTRY_DSN=""
TENOR_API_KEY=""
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:admin@example.com"
```

### 3. Database and storage setup

```bash
npm run prisma:generate
npm run prisma:migrate
```

In Supabase Dashboard, create a public Storage bucket named `uploads`.

### 4. Run locally

```bash
pnpm dev        # http://localhost:3000
pnpm build      # production build
pnpm lint       # lint check
pnpm typecheck  # TypeScript check
pnpm test       # helper unit checks
```

---

## Project structure

```text
Boltushka24/
├── app/
│   ├── (auth)/
│   ├── (invite)/
│   ├── (main)/
│   │   └── (routes)/servers/[serverId]/
│   │       ├── channels/[channelId]/
│   │       │   └── watch/
│   │       └── conversations/[memberId]/
│   ├── api/
│   └── setup/
├── components/
│   ├── chat/
│   ├── modals/
│   ├── navigation/
│   ├── server/
│   ├── watch/
│   ├── ui/
│   ├── mobile-toggle.tsx
│   └── mobile-sheet-content.tsx
├── lib/
│   ├── db.ts
│   ├── supabase.ts
│   ├── realtime.ts
│   ├── permissions.ts
│   ├── message-formatting.ts
│   ├── youtube.ts
│   ├── current-profile.ts
│   └── initial-profile.ts
├── prisma/
│   └── schema.prisma
├── docs/
└── pages/api/socket/
```

---

## v2.0 highlights

Branch `v2` is the production upgrade line. It includes shipped migrations, phase tags, and a CI gate.

- Migrated legacy chat APIs toward App Router handlers.
- Added shared HTTP/API error helpers.
- Improved query invalidation and realtime refetch patterns.
- Added virtualized long chats.
- Added read states, unread counters, threads, replies, pinned/saved messages, reactions, polls, link previews, GIF proxy, stickers, voice messages, image lightbox, and uploads.
- Added presence, idle/DND/invisible states, custom status, typing broadcasts, online counts, and sidebar typing hints.
- Added database-backed YouTube watch sessions.
- Added PWA install support, service worker, offline outbox, and Web Push subscriptions.
- Added custom roles, channel slow mode, global search, command palette, message forwarding, and audit-backed admin actions.
- Added CI workflow for install, Prisma generation, typecheck, lint, and build.

---

## Deployment on Vercel

1. Fork this repository.
2. Create a new Vercel project and connect GitHub.
3. Add the required environment variables.
4. Deploy.
5. Run production migrations with:

```bash
npm run prisma:deploy
```

After deployment, add the production domain to Clerk, Supabase, and LiveKit settings where required.

---

## Roadmap

- [x] Web Push notifications
- [x] Threads inside messages
- [x] Stickers and GIF picker
- [x] PWA install support and offline outbox
- [ ] Channel theming with colors and icons
- [ ] Bot API and webhooks
- [ ] Screen sharing in voice channels
- [ ] End-to-end encryption for DMs

---

## Development workflow

- Main branch: `master`
- Feature branches: `devin/<timestamp>-<name>` or `feat/<name>`
- Pull requests should pass lint, typecheck, and build before merge.

Useful commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
pnpm prisma studio
```

---

## License

[MIT](LICENSE) © 1notlov3

---

<div align="center">

If you like this project, give it a ⭐ on GitHub.

Built with ❤️ by 1notlov3

</div>
