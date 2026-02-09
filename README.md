# Boltushka24

Next.js 14 chat/community app with authentication and real-time communication features.

## Overview

Boltushka24 is a full-stack web app structured as a modern Next.js project with auth, channels/conversations, media handling, and real-time integrations.

## Features

- Authentication via Clerk
- Real-time communication layer (LiveKit integration)
- App Router architecture (Next.js 14)
- Prisma-backed data access
- Media upload pipeline (Cloudinary)
- Optional AI-related functionality (OpenAI key in env)

## Stack

- Next.js 14
- React
- TypeScript
- Prisma
- Clerk
- LiveKit
- Cloudinary

## Setup

Create `.env` with required keys:

```env
DATABASE_URL="..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
NEXT_PUBLIC_LIVEKIT_URL="..."
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="..."
OPENAI_API_KEY="..." # optional depending on feature usage
```

Install and run:

```bash
npm install
npm run dev
```

## Usage

- Open `http://localhost:3000`
- Sign in / sign up (`/sign-in`, `/sign-up`)
- Use channels/conversations and supported real-time features

## Current run status

In this environment, a reliable runtime demo GIF was **not captured** because required external services (DB/auth/realtime/cloud env) were not configured end-to-end.

## TODO: demo capture

- [ ] Prepare full `.env` with working service credentials
- [ ] Seed test data
- [ ] Record and add real feature walkthrough GIF to `docs/demo/`
