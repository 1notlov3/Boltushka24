# Deployment

## Required Services

- PostgreSQL/Supabase project
- Supabase Storage bucket `uploads`
- Clerk application
- LiveKit Cloud project for voice/video

## Environment

Copy `.env.example` to `.env.local` for local development and configure the same variables in Vercel.

Never commit `.env.local` or production secrets.

## Database

This repo currently uses `prisma db push`.

```bash
npm run prisma:generate
npm run prisma:push
```

The upgrade adds nullable/defaulted fields and additive tables. Existing data is preserved by `db push`.

## Build Gates

```bash
npm install
npm run prisma:generate
npm run typecheck
npm run lint
npm run test
npm run build
```

## Production Notes

- Current rate limiting is in-memory and suitable for development/single runtime only.
- For production serverless scale, replace it with Redis/Upstash while keeping the same `checkRateLimit` call sites.
- Supabase Realtime payloads must remain signal-only for private DM safety.
