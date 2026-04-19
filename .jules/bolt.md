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

## 2024-05-24 - [Consolidating Array Iterations]
**Learning:** Multiple `.filter()` and `.find()` calls on the same array (like `server.channels` or `server.members`) create redundant O(N) passes, which can impact rendering performance for large datasets.
**Action:** When extracting multiple distinct subsets or values from a single array, consolidate the iterations into a single O(N) `for...of` loop. Initialize explicitly typed empty arrays (e.g., `const list: (typeof data.items) = []`) to preserve Prisma type safety.
