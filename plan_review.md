1. **Read `components/chat/chat-item.tsx`**
   - Verify the exact code around the non-semantic `div` and `p` tags used for user profile interactions.
2. **Refactor User Profile Interactions in `components/chat/chat-item.tsx`**
   - Modify the `<div>` tag wrapping the `UserAvatar` and the `<p>` tag wrapping `{member.profile.name}` into semantic `<button type="button">` elements.
   - Add the standardized attribute `aria-label={`Посмотреть профиль пользователя ${member.profile.name}`}`.
   - Add focus visibility classes (`focus-visible:ring-2 focus-visible:ring-zinc-500 dark:focus-visible:ring-zinc-400 focus:outline-none`) to ensure keyboard users can navigate to these interactive elements and see focus.
3. **Read `.Jules/palette.md`**
   - Check the current contents to prepare for adding a new learning entry.
4. **Update `.Jules/palette.md`**
   - Append a new journal entry about refactoring non-semantic interactive elements into semantic buttons with explicit `aria-label`s and focus states for user profiles.
5. **Verify File Modifications**
   - Read `.Jules/palette.md` to confirm the successful application of the new learning.
6. **Verify Build & Lint**
   - Run `pnpm lint && pnpm build` to ensure no errors were introduced.
7. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
8. **Submit PR**
   - Submit the PR with the title: `🎨 Palette: Refactor interactive user profiles to semantic buttons in chat`
   - Description includes: What, Why, Before/After (if visual), and Accessibility sections.
