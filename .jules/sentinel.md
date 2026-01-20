# Sentinel's Journal

## 2024-05-22 - Missing Input Validation in API Routes
**Vulnerability:** API routes accept user input without length or format validation, allowing for potential DoS or data integrity issues.
**Learning:** Next.js API routes do not validate body content by default; explicit validation (e.g., Zod) is required.
**Prevention:** Always validate `req.body` against a strict schema before processing using libraries like Zod.
