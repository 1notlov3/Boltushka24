# Bolt's Journal - Critical Learnings

## 2024-05-22 - [Prisma Select Optimization]
**Learning:** Using default Prisma `findMany` queries fetches all scalar fields, which can add up in global components like `NavigationSidebar`.
**Action:** Always check if a component uses a subset of fields and use `select` to minimize data transfer. Verified that `NavigationSidebar` only needs `id`, `name`, and `imageUrl`, allowing us to exclude `inviteCode`, `profileId`, `createdAt`, and `updatedAt`.

## 2024-05-24 - [Lazy Load Emoji Picker]
**Learning:** Heavy UI libraries like `emoji-mart` can significantly impact bundle size. Since the picker is hidden in a Popover, it should be lazy loaded.
**Action:** Use `next/dynamic` to split the `EmojiPicker` component and its data into a separate chunk that loads only on interaction.
