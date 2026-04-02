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

## 2026-06-25 - [Prisma Select on Redirects]
**Learning:** When checking the first element of a related model for automatic redirection (e.g., redirecting to a server's initial channel), using `include: { channels: true }` fetches the entire channel record. This wastes bandwidth and memory serialization, especially if channel objects are large.
**Action:** When a route performs an automatic redirect based on related data, always use `select` instead of `include` to fetch only the required IDs and minimal fields (e.g., `id`, `name`) needed for the redirect logic to minimize payload and memory overhead.
