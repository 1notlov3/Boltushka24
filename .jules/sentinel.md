# Sentinel's Journal

## 2024-05-22 - Missing Input Validation in API Routes
**Vulnerability:** API routes accept user input without length or format validation, allowing for potential DoS or data integrity issues.
**Learning:** Next.js API routes do not validate body content by default; explicit validation (e.g., Zod) is required.
**Prevention:** Always validate `req.body` against a strict schema before processing using libraries like Zod.

## 2024-05-23 - IDOR in Direct Messages API
**Vulnerability:** The Direct Messages API (`/api/direct-messages`) allowed access to messages by simply providing a `conversationId`, without verifying if the requesting user was a participant in that conversation.
**Learning:** Checking for authentication (`currentProfile`) is not enough; authorization (checking membership) is critical for nested resources or private data.
**Prevention:** Always verify that the current user has the right to access the specific resource (e.g., is a member of the conversation or server) using `where` clauses in Prisma queries.

## 2024-05-24 - Unprotected LiveKit Token Generation
**Vulnerability:** The `/api/livekit` endpoint generated tokens for any `room` and `username` without checking if the user was authenticated or authorized to access that room. It also allowed client-side `username` spoofing.
**Learning:** External service integrations (like LiveKit) often require generating tokens server-side. These endpoints must be protected with the same rigor as data access endpoints, ensuring the user has access to the context (channel/conversation) the token is for.
**Prevention:** Verify `currentProfile` authentication and check membership in the target Channel or Conversation before generating tokens. Use server-side user data (`profile.id`, `profile.name`) for token identity instead of client-provided values.

## 2024-05-25 - Unvalidated Route Parameters
**Vulnerability:** API routes (e.g., `app/api/members/[memberId]/route.ts`) were using `params.memberId` and `searchParams.get("serverId")` directly in Prisma queries without validating that they were valid UUIDs.
**Learning:** While Prisma might handle invalid UUIDs gracefully, explicit validation is crucial for defense-in-depth, ensuring data integrity, and providing clear 400 Bad Request errors to clients.
**Prevention:** Always define Zod schemas for route parameters (`params`) and query parameters (`searchParams`) and validate them using `.uuid()` before use.

## 2024-05-26 - Stored XSS via File URL
**Vulnerability:** The `fileUrl` field in message creation APIs (`pages/api/socket/messages/index.ts` and `pages/api/socket/direct-messages/index.ts`) accepted any URL, including `javascript:` protocol. This allowed attackers to store malicious scripts that execute when other users interact with the message (e.g., clicking a link or broken image).
**Learning:** `z.string().url()` validation in Zod accepts the `javascript:` protocol because it relies on the native `URL` constructor. Standard URL validation is insufficient for preventing XSS; strict protocol allowlisting (http/https) is required.
**Prevention:** Always validate URLs against an allowlist of safe protocols (e.g., `.regex(/^(http|https):\/\//i)`) when accepting user input that will be rendered as links or images.
## 2024-05-24 - [Fix Stored XSS / SSRF bypass in ImageUrlSchema]
**Vulnerability:** The API allowed submitting image URLs via `v.startsWith("data:image/") || /^https?:\/\//.test(v)`. This weak regex only checks if the string starts with `http://` or `https://` but does not guarantee the URL structure is valid.
**Learning:** The previous regex bypass allowed strings like `http://example.com" onerror="alert(1)` to be saved. If later rendered unescaped, this could lead to Stored XSS. Furthermore, accepting any string starting with `http` can lead to SSRF if the backend attempts to fetch the image.
**Prevention:** When validating inputs that accept both HTTP(S) URLs and data URIs, combine `z.string().url().safeParse(v).success` with `/^https?:\/\//i.test(v)` to strictly validate the URL structure and enforce safe protocols, preventing SSRF and Stored XSS bypasses.
