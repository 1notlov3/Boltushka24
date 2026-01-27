# Sentinel's Journal

## 2024-05-22 - Missing Input Validation in API Routes
**Vulnerability:** API routes accept user input without length or format validation, allowing for potential DoS or data integrity issues.
**Learning:** Next.js API routes do not validate body content by default; explicit validation (e.g., Zod) is required.
**Prevention:** Always validate `req.body` against a strict schema before processing using libraries like Zod.

## 2024-05-23 - IDOR in Direct Messages API
**Vulnerability:** The Direct Messages API (`/api/direct-messages`) allowed access to messages by simply providing a `conversationId`, without verifying if the requesting user was a participant in that conversation.
**Learning:** Checking for authentication (`currentProfile`) is not enough; authorization (checking membership) is critical for nested resources or private data.
**Prevention:** Always verify that the current user has the right to access the specific resource (e.g., is a member of the conversation or server) using `where` clauses in Prisma queries.

## 2024-05-24 - Inconsistent Input Validation in Socket Endpoints
**Vulnerability:** `pages/api/socket/messages` had validation, but `pages/api/socket/direct-messages` did not, allowing unvalidated input.
**Learning:** When similar endpoints exist (e.g. Channel Messages vs Direct Messages), developers often secure the first one they implement but forget to apply the same rigor to the copy/variant.
**Prevention:** Audit "sibling" endpoints when finding a vulnerability in one or securing one. Use shared schemas where possible.
