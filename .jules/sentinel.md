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
