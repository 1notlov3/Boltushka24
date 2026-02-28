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

## 2026-06-21 - [Memoizing Formatting in Lists]
**Learning:** Calling `format()` from `date-fns` inside the `.map()` loop of a long list component (like `ChatMessages`) causes O(N) formatting computations on every re-render.
**Action:** Pass raw data (e.g., ISO date strings or Date objects) to the child item component (e.g., `ChatItem`). Perform the formatting inside the child component and wrap it in a `useMemo` hook. This reduces formatting complexity to O(1) for existing items during parent re-renders.
