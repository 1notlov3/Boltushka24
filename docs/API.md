# API

Все новые endpoints требуют аутентификацию Clerk и проверяют доступ к server/channel/conversation.

## Messages

- `GET /api/messages?channelId=&cursor=` - pagination.
- `GET /api/messages/search?channelId=&q=&authorId=` - поиск по каналу.
- `GET /api/messages/pinned?channelId=` - закреплённые сообщения.
- `POST /api/messages/:messageId/reactions` - toggle reaction, body `{ "emoji": "👍" }`.
- `PATCH /api/messages/:messageId/pin` - pin/unpin, body `{ "pinned": true }`.
- `POST /api/messages/:messageId/save` - toggle saved.

## Direct Messages

- `GET /api/direct-messages?conversationId=&cursor=` - pagination.
- `GET /api/direct-messages/search?conversationId=&q=` - поиск по DM.
- `GET /api/direct-messages/pinned?conversationId=` - закреплённые DM.
- `POST /api/direct-messages/:directMessageId/reactions` - toggle reaction.
- `PATCH /api/direct-messages/:directMessageId/pin` - pin/unpin.
- `POST /api/direct-messages/:directMessageId/save` - toggle saved.

## Settings And Notifications

- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/notifications`
- `PATCH /api/notifications` with `{ "markAllRead": true }`
- `GET /api/saved-messages`

## Channel Categories

- `GET /api/channel-categories?serverId=`
- `POST /api/channel-categories?serverId=`
- `PATCH /api/channel-categories/:categoryId`
- `DELETE /api/channel-categories/:categoryId`

## Legacy Chat Write Routes

- `POST /api/socket/messages?serverId=&channelId=`
- `PATCH|DELETE /api/socket/messages/:messageId?serverId=&channelId=`
- `POST /api/socket/direct-messages?conversationId=`
- `PATCH|DELETE /api/socket/direct-messages/:directMessageId?conversationId=`

These routes now accept reply parent ids and return enriched message payloads.
