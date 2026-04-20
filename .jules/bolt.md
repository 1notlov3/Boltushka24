# Bolt's Journal - Critical Learnings

## 2024-05-22 - [Prisma Select Optimization]
**Learning:** Using default Prisma `findMany` queries fetches all scalar fields, which can add up in global components like `NavigationSidebar`.
**Action:** Always check if a component uses a subset of fields and use `select` to minimize data transfer. Verified that `NavigationSidebar` only needs `id`, `name`, and `imageUrl`, allowing us to exclude `inviteCode`, `profileId`, `createdAt`, and `updatedAt`.

## 2026-01-25 - [Prisma Include vs Select]
**Learning:** Found `include: { members: true }` in `pages/api/socket/messages/index.ts` which fetches all members of a server (potentially thousands) just to find the current user's member ID. This is a significant scalability bottleneck.
**Action:** Replaced O(N) in-memory filtering with O(1) direct database lookup using `db.member.findFirst`. Also applied `select: { id: true }` to other existence checks to minimize payload.

## 2026-06-15 - [Parallelizing Independent Queries]
**Learning:** In Server Components like `ChannelIdPage`, sequential `await` calls for independent data (e.g., fetching channel info and member info) create a waterfall effect, increasing page load time.
**Action:** Use `Promise.all` to fetch independent data concurrently. Applied this to `ChannelIdPage` to fetch `channel` and `member` in parallel.

## 2026-06-20 - [Tooltip Provider Overhead]
**Learning:** `ActionTooltip` was wrapping every tooltip in its own `TooltipProvider`, creating hundreds of context providers and preventing shared state (like `skipDelayDuration`).
**Action:** Moved `TooltipProvider` to `app/layout.tsx` to wrap the entire app once. Removed it from `ActionTooltip`. This improves performance and UX.

## 2024-05-23 - [Consolidating Authorization Queries]
**Learning:** Performing a separate findFirst query just to check authorization before a broader findMany query that fetches the same parent dataset introduces an unnecessary database roundtrip and latency.
**Action:** Replace the separate findFirst query with an in-memory .some() check on the results of the findMany query to save a database roundtrip when the same dataset must be fetched anyway.

## 2024-05-23 - [Authorization Check Anti-pattern]
**Learning:** Consolidating an early authorization `findFirst` check into an in-memory check after a heavier `findMany` query is a critical anti-pattern. It introduces a DoS vulnerability because unauthorized requests will now trigger heavy database queries and memory allocations before being rejected. Authorization must always fail fast and early before performing any heavy operations.
**Action:** Never optimize away an early authorization check if it means delaying the rejection of unauthorized requests until after heavier database queries. Restore the original `findFirst` check for authorization.

## 2024-05-24 - [Consolidating Redundant Iterations]
**Learning:** Performing multiple independent .filter() and .find() calls on the same arrays (like server.channels and server.members) inside Server Components introduces redundant O(N) iterations, which can impact performance as datasets grow.
**Action:** Replace multiple separate array traversals with a single for...of loop that accumulates the necessary partitioned arrays and extracted values in one pass.
