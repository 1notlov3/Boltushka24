# Bolt's Journal - Critical Learnings

## 2024-05-22 - [Prisma Select Optimization]
**Learning:** Using default Prisma `findMany` queries fetches all scalar fields, which can add up in global components like `NavigationSidebar`.
**Action:** Always check if a component uses a subset of fields and use `select` to minimize data transfer. Verified that `NavigationSidebar` only needs `id`, `name`, and `imageUrl`, allowing us to exclude `inviteCode`, `profileId`, `createdAt`, and `updatedAt`.

## 2024-05-24 - [Socket Message Optimization]
**Learning:** Socket.io event payloads for chat messages were including the full `Profile` object (including `email`, `createdAt`, etc.) because the Prisma query used `include: { member: { include: { profile: true } } }`. For high-volume real-time events, this payload size adds up.
**Action:** Used `select` within the `include` block to explicitly fetch only `id`, `name`, and `imageUrl` for the profile in `pages/api/socket/messages/index.ts`. Also optimized the authorization check to only fetch the current member instead of all server members.
