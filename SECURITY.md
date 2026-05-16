# Security Policy

## Supported Version

Security fixes target `master` and active feature branches.

## Reporting

Open a private GitHub security advisory or contact the repository owner directly. Do not publish exploit details before a fix is available.

## Application Security Notes

- API routes must derive `profileId`/`memberId` from Clerk auth and database membership.
- Client-provided membership identifiers are not trusted.
- DM access must always verify the authenticated profile belongs to `memberOne` or `memberTwo`.
- Realtime broadcasts must not include message content or private file URLs.
- File uploads are restricted by MIME type and size in the client. Production deployments should mirror these checks with Supabase policies or a signed-upload backend.
- The development rate limiter is memory-backed; use a shared store for production.
