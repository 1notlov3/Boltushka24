# Contributing

## Local Workflow

```bash
npm install
npm run prisma:generate
npm run dev
```

## Before Opening A PR

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Code Guidelines

- Keep API validation in Zod.
- Use `lib/permissions.ts` for role checks.
- Keep realtime payloads signal-only.
- Prefer small client components and keep server/client boundaries explicit.
- Add tests for pure helpers when adding parsing, permission, or formatting logic.
