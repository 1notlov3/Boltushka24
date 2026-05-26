# Deployment

## Required Services

- PostgreSQL/Supabase project
- Supabase Storage bucket `uploads`
- Clerk application
- LiveKit Cloud project for voice/video
- Vercel project

## Environment

Copy `.env.example` to `.env.local` for local development and configure the same variables in Vercel.

Never commit `.env.local` or production secrets.

Boltushka24 validates env during `npm run build` via:

```bash
npm run env:check
```

The check fails early when required production services are missing or an optional env group is only partially configured.

### Required variables

Server-only secrets:

- `DATABASE_URL` — pooled PostgreSQL URL for runtime Prisma access.
- `DIRECT_URL` — direct PostgreSQL URL for Prisma migrations/deploy.
- `CLERK_SECRET_KEY` — Clerk server secret.
- `SUPABASE_SECRET_KEY` — Supabase service/admin key.

Public client variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Defaults:

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` defaults to `/sign-in`.
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` defaults to `/sign-up`.

### Optional feature groups

LiveKit voice/video is enabled only when all three are set:

- `NEXT_PUBLIC_LIVEKIT_URL` — must start with `wss://` or `ws://`.
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Upstash distributed rate limit is enabled only when both are set:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

`RATE_LIMIT_BACKEND` can be:

- `memory` — default, acceptable for local/dev and preview.
- `upstash` — requires both Upstash variables.

Web push is enabled only when both VAPID keys are set:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` defaults to `mailto:admin@example.com`; in production replace it with a real contact if web push is enabled.

Other optional variables:

- `TENOR_API_KEY` — enables GIF search.
- `SENTRY_DSN` — server-side Sentry DSN.
- `NEXT_PUBLIC_SENTRY_DSN` — client-side Sentry DSN.

## Vercel setup

1. Import the GitHub repository in Vercel.
2. Set Environment Variables for Production and Preview.
3. Keep secrets server-only. Never prefix secrets with `NEXT_PUBLIC_`.
4. Use pooled Supabase/Postgres connection for `DATABASE_URL` and direct connection for `DIRECT_URL`.
5. Use build command:

```bash
npm run build
```

`npm run build` runs `npm run env:check` before `next build`.

## Database

Generate Prisma client:

```bash
npm run prisma:generate
```

For local additive schema sync:

```bash
npm run prisma:push
```

For production migrations:

```bash
npm run prisma:deploy
```

Run production migrations as a controlled deploy step, not from request handlers.

## Build Gates

```bash
npm install
npm run prisma:generate
npm run env:check
npm run typecheck
npm run lint
npm run test
npm run build
```

## Production Notes

- Supabase Realtime payloads must remain signal-only for private DM safety.
- Use Upstash on Vercel for real distributed rate limiting.
- Missing LiveKit env disables voice/video token issuing with a clear `503` response.
- Client error boundaries use only `NEXT_PUBLIC_SENTRY_DSN`; server secrets stay server-only.
- Env validation is centralized in `lib/env.ts`; server and public re-exports live in `lib/server-env.ts` and `lib/public-env.ts`.
