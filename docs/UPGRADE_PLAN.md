# v2 upgrade status

The production upgrade plan has been completed on branch `v2`.

Authoritative release notes now live in the README section `v2.0 changes`. Database changes are represented as Prisma migrations under `prisma/migrations`, and CI verifies the production gate with npm install, Prisma generate, typecheck, lint, and build.

Operational checklist for deploy:

- Run `npm run prisma:deploy` against production before promoting the app.
- Configure Supabase, Clerk, LiveKit, optional Upstash, optional Tenor, and optional VAPID environment variables from the README.
- Keep releases tagged by phase: `v2-phase-1-ok` through `v2-phase-10-ok`.
