# Group DM Foundation Plan

## Goal

Prepare Boltushka24 for real group direct messages without breaking existing 1-on-1 server-scoped conversations.

This phase is intentionally backend/schema-first. It does not expose a full Group DM UI yet.

## Current legacy behavior

Existing direct conversations use:

- `Conversation.memberOneId`
- `Conversation.memberTwoId`
- route `/servers/:serverId/conversations/:memberId`
- `getOrCreateConversation(memberOneId, memberTwoId)`

This behavior remains supported.

## Added foundation

### Schema additions

- `ConversationType`
  - `DIRECT`
  - `GROUP`
- `ConversationParticipantRole`
  - `OWNER`
  - `ADMIN`
  - `MEMBER`
- `Conversation.type`
- `Conversation.name`
- `Conversation.imageUrl`
- `Conversation.serverId`
- `Conversation.ownerId`
- `Conversation.createdAt`
- `Conversation.updatedAt`
- `ConversationParticipant`
  - participant membership for both direct and group conversations
  - soft-leave via `leftAt`
  - notification/UX prep via `mutedUntil` and `archivedAt`

### Migration strategy

Migration is additive:

1. Keep legacy `memberOneId` and `memberTwoId` required.
2. Add nullable metadata fields.
3. Add `ConversationParticipant` table.
4. Backfill existing direct conversations into participants.
5. Backfill `Conversation.serverId` from `memberOne.serverId`.

This keeps existing APIs and routes working while new services can start using participant-based access.

## Service layer

`lib/conversation.ts` now provides foundation helpers:

- `getOrCreateConversation(memberOneId, memberTwoId)` — legacy-compatible alias.
- `getOrCreateDirectConversation({ memberOneId, memberTwoId })`.
- `findDirectConversation({ memberOneId, memberTwoId })`.
- `ensureDirectConversationParticipants(conversationId, memberOneId, memberTwoId)`.
- `createGroupConversation({ ownerMemberId, memberIds, name, imageUrl })`.
- `addConversationParticipants({ conversationId, actorMemberId, memberIds })`.
- `removeConversationParticipant({ conversationId, actorMemberId, memberId })`.
- `leaveGroupConversation({ conversationId, memberId })`.
- `getConversationAccess({ conversationId, profileId })`.
- `getConversationAccessByMemberId({ conversationId, memberId })`.
- `findConversationParticipants({ conversationId, includeLeft })`.
- `getConversationUnreadCount({ conversationId, memberId })`.
- `markConversationRead({ conversationId, profileId })`.

## Important compatibility notes

- New group conversations still fill `memberOneId` and `memberTwoId` with owner + first other participant because the legacy schema still requires these fields.
- Real group conversation UI should use a route by `conversationId`, not the legacy `memberId` route.
- Existing 1-on-1 route must remain unchanged until group routes are added.
- Direct-message routes still need follow-up migration to use `getConversationAccess` everywhere.

## Next implementation tasks

1. Add group conversation route:
   - `/servers/[serverId]/conversations/group/[conversationId]`
2. Add API endpoints:
   - `POST /api/conversations/group`
   - `PATCH /api/conversations/[conversationId]/participants`
   - `DELETE /api/conversations/[conversationId]/participants/[memberId]`
3. Migrate direct-message routes to participant-based access:
   - list/create messages
   - edit/delete messages
   - pinned messages
   - reactions
   - read state
4. Update Home Inbox to display `Conversation.type === GROUP` with group title/avatar.
5. Add group creation UI from Home Inbox.

## Risks to address later

- `@@unique([memberOneId, memberTwoId])` does not prevent reverse-order direct duplicates.
- Group notification fan-out needs mute/mention strategy to avoid spam.
- Unread endpoints currently do many count queries and will need aggregation when usage grows.
- Owner transfer is required before allowing the last owner to leave.
