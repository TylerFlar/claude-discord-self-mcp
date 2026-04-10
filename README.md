# claude-discord-self-mcp

MCP server that gives Claude Code (and Claude Desktop) full Discord selfbot capabilities via a user account token and the Model Context Protocol.

> **⚠️ Disclaimer** — This project uses `discord.js-selfbot-v13` to log in as a **user account**, which violates [Discord's Terms of Service](https://discord.com/terms). Your account may be suspended or terminated. Use at your own risk for personal/educational purposes only.

## Architecture

The server exposes 71 MCP tools across 15 categories, wrapping the `discord.js-selfbot-v13` library. It communicates over **stdio** transport using `@modelcontextprotocol/sdk`. Authentication is handled by passing a Discord **user token** via the `DISCORD_TOKEN` environment variable — the server logs in once and maintains a singleton `Client` instance for the lifetime of the process. All Discord API calls go through discord.js abstractions (no raw HTTP).

## Prerequisites

- Node.js >= 18
- A Discord user account token ([how to obtain](#2-environment-variables))

## Setup

### 1. Install & Build

```bash
npm install
npm run build
```

### 2. Environment Variables

Create a `.env` file or pass directly in the MCP config:

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Discord user account token. Open Discord in a browser → F12 → Network tab → find any request to `discord.com/api` → copy the `Authorization` header value. |

### 3. MCP Client Configuration

**Claude Code** (`.claude.json` or project MCP settings):

```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["/absolute/path/to/claude-discord-self-mcp/dist/index.js"],
      "env": {
        "DISCORD_TOKEN": "your_discord_user_token_here"
      }
    }
  }
}
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["/absolute/path/to/claude-discord-self-mcp/dist/index.js"],
      "env": {
        "DISCORD_TOKEN": "your_discord_user_token_here"
      }
    }
  }
}
```

## Tools Reference

### Messages (9 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_send_message` | `channelId: string, content: string` | Send a message to a channel |
| `discord_read_messages` | `channelId: string, limit?: number, before?: string, after?: string` | Read recent messages from a channel (default 25, max 100) |
| `discord_edit_message` | `channelId: string, messageId: string, content: string` | Edit one of your own messages |
| `discord_delete_message` | `channelId: string, messageId: string` | Delete a message in a channel |
| `discord_reply_to_message` | `channelId: string, messageId: string, content: string, mention?: boolean` | Reply to a specific message (mention defaults to true) |
| `discord_pin_message` | `channelId: string, messageId: string` | Pin a message in a channel |
| `discord_unpin_message` | `channelId: string, messageId: string` | Unpin a message in a channel |
| `discord_get_pinned_messages` | `channelId: string` | Get all pinned messages in a channel |
| `discord_search_messages` | `guildId: string, query: string, authorId?: string, channelId?: string, has?: "link"\|"embed"\|"file"\|"video"\|"image"\|"sound"\|"sticker", limit?: number` | Search messages in a server (default 25, max 100) |

### DMs (4 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_open_dm` | `userId: string` | Open or get an existing DM channel with a user |
| `discord_list_dms` | `limit?: number` | List recent DM channels (default 20, max 100) |
| `discord_read_dm_history` | `userId: string, limit?: number, before?: string` | Read message history from a DM (default 25, max 100) |
| `discord_send_dm` | `userId: string, content: string` | Send a direct message to a user |

### Servers (5 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_list_guilds` | *(none)* | List all servers the account is in |
| `discord_guild_info` | `guildId: string` | Get detailed information about a server |
| `discord_list_members` | `guildId: string, limit?: number, after?: string` | List server members (default 50, max 100) |
| `discord_search_members` | `guildId: string, query: string, limit?: number` | Search members by username or nickname (default 20, max 100) |
| `discord_leave_guild` | `guildId: string` | Leave a server |

### Channels (6 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_list_channels` | `guildId: string` | List all channels in a server |
| `discord_channel_info` | `channelId: string` | Get detailed information about a channel |
| `discord_create_channel` | `guildId: string, name: string, type?: "GUILD_TEXT"\|"GUILD_VOICE"\|"GUILD_CATEGORY", parentId?: string, topic?: string` | Create a new channel (defaults to text) |
| `discord_edit_channel` | `channelId: string, name?: string, topic?: string, nsfw?: boolean, slowmode?: number` | Edit channel properties (slowmode 0-21600s) |
| `discord_delete_channel` | `channelId: string` | Delete a channel |
| `discord_set_channel_permissions` | `channelId: string, targetId: string, targetType: "role"\|"member", allow?: string, deny?: string` | Set permission overwrite for a role or user |

### Threads (6 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_create_thread` | `channelId: string, name: string, messageId?: string, autoArchiveDuration?: "60"\|"1440"\|"4320"\|"10080"` | Create a thread (optionally from a message, default archive 1440m) |
| `discord_list_threads` | `channelId: string` | List active threads in a channel |
| `discord_list_archived_threads` | `channelId: string, type?: "public"\|"private", limit?: number` | List archived threads (default public, max 100) |
| `discord_join_thread` | `threadId: string` | Join a thread |
| `discord_leave_thread` | `threadId: string` | Leave a thread |
| `discord_archive_thread` | `threadId: string, locked?: boolean` | Archive and optionally lock a thread |

### Reactions (4 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_add_reaction` | `channelId: string, messageId: string, emoji: string` | Add a reaction (unicode emoji or `name:id` for custom) |
| `discord_remove_reaction` | `channelId: string, messageId: string, emoji: string` | Remove your reaction from a message |
| `discord_list_reactions` | `channelId: string, messageId: string, emoji: string, limit?: number` | List users who reacted with an emoji (default 25, max 100) |
| `discord_clear_reactions` | `channelId: string, messageId: string` | Remove all reactions from a message |

### Users (7 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_user_info` | `userId: string` | Get information about a user by ID |
| `discord_my_profile` | *(none)* | Get the authenticated user's profile |
| `discord_list_friends` | *(none)* | List all friends/relationships |
| `discord_list_blocked` | *(none)* | List all blocked users |
| `discord_send_friend_request` | `userId: string` | Send a friend request |
| `discord_remove_friend` | `userId: string` | Remove a friend or cancel a request |
| `discord_guild_member_info` | `guildId: string, userId: string` | Get a user's server-specific profile (nickname, roles, join date) |

### Roles (6 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_list_roles` | `guildId: string` | List all roles in a server |
| `discord_role_info` | `guildId: string, roleId: string` | Get detailed information about a role |
| `discord_assign_role` | `guildId: string, userId: string, roleId: string` | Add a role to a member |
| `discord_remove_role` | `guildId: string, userId: string, roleId: string` | Remove a role from a member |
| `discord_create_role` | `guildId: string, name: string, color?: string, permissions?: string, mentionable?: boolean, hoist?: boolean` | Create a new role (color as hex e.g. `#ff0000`) |
| `discord_delete_role` | `guildId: string, roleId: string` | Delete a role |

### Moderation (7 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_kick_member` | `guildId: string, userId: string, reason?: string` | Kick a member from a server |
| `discord_ban_member` | `guildId: string, userId: string, reason?: string, deleteMessageDays?: number` | Ban a member (deleteMessageDays 0-7, default 0) |
| `discord_unban_member` | `guildId: string, userId: string` | Unban a user |
| `discord_timeout_member` | `guildId: string, userId: string, duration: number, reason?: string` | Timeout a member (duration in seconds, max 28 days) |
| `discord_remove_timeout` | `guildId: string, userId: string` | Remove timeout from a member |
| `discord_purge_messages` | `channelId: string, count: number, userId?: string` | Bulk delete messages (2-100, max 14 days old) |
| `discord_list_bans` | `guildId: string, limit?: number` | List banned users (default 100, max 1000) |

### Presence (4 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_set_status` | `status: "online"\|"idle"\|"dnd"\|"invisible"` | Set your online status |
| `discord_set_custom_status` | `text?: string, emoji?: string, expiresAt?: string` | Set custom status text/emoji (expiresAt as ISO timestamp) |
| `discord_set_activity` | `type: "PLAYING"\|"STREAMING"\|"LISTENING"\|"WATCHING"\|"COMPETING", name: string, url?: string` | Set an activity (url for streaming type) |
| `discord_clear_activity` | *(none)* | Clear all activities and custom status |

### Invites (4 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_create_invite` | `channelId: string, maxAge?: number, maxUses?: number, temporary?: boolean` | Create an invite (maxAge in seconds, 0=permanent, default 86400) |
| `discord_list_invites` | `guildId: string` | List all invites for a server |
| `discord_delete_invite` | `code: string` | Revoke an invite by code |
| `discord_accept_invite` | `code: string` | Join a server via invite code |

### Webhooks (5 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_list_webhooks` | `channelId?: string, guildId?: string` | List webhooks for a channel or guild |
| `discord_create_webhook` | `channelId: string, name: string, avatar?: string` | Create a webhook (avatar as image URL) |
| `discord_send_webhook` | `webhookId: string, webhookToken: string, content?: string, username?: string, avatarUrl?: string, embeds?: array` | Send a message via webhook |
| `discord_delete_webhook` | `webhookId: string` | Delete a webhook |

### Emojis & Stickers (2 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_list_emojis` | `guildId: string` | List all custom emojis in a server |
| `discord_list_stickers` | `guildId: string` | List all stickers in a server |

### Attachments (2 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_send_attachment` | `channelId: string, url: string, filename?: string, content?: string` | Send a file to a channel by URL |
| `discord_send_embed` | `channelId: string, title?: string, description?: string, color?: string, fields?: array, imageUrl?: string, thumbnailUrl?: string, footerText?: string, url?: string` | Send a rich embed message |

### Voice (1 tool)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `discord_list_voice_members` | `channelId: string` | List members currently in a voice channel |

## Internal API Layer

### `getClient()` (src/client.ts)

- **Purpose**: Singleton factory for the Discord selfbot client
- **Auth flow**: Reads `DISCORD_TOKEN` from env, calls `client.login(token)`, resolves on the `ready` event. The promise is cached — subsequent calls return the same client.
- **Error handling**: Resets the cached promise to `null` on login failure or client error, allowing re-initialization on next call. No retry logic — errors propagate directly to tool handlers.

### Helper utilities (src/helpers.ts)

- `toolResult(data)` — Wraps any value as a JSON text MCP response
- `toolError(error)` — Wraps an error as an MCP error response with `isError: true`
- `formatMessage(msg)` — Serializes a Discord Message to `{id, author, content, timestamp, editedAt, attachments, embeds, reactions, referencedMessageId, pinned, type}`
- `formatChannel(ch)` — Serializes a Channel to `{id, type, name, topic, parentId, nsfw, slowmode, position}`
- `formatGuild(guild)` — Serializes a Guild to `{id, name, icon, ownerId, memberCount, description, features, createdAt}`
- `formatMember(member)` — Serializes a GuildMember to `{userId, username, discriminator, nickname, roles, joinedAt, premiumSince, avatar}`
- `formatRole(role)` — Serializes a Role to `{id, name, color, position, permissions, mentionable, hoist, managed, memberCount}`
- `formatUser(user)` — Serializes a User to `{id, username, discriminator, avatar, bot, createdAt, banner}`

## Development

```bash
npm run dev    # Run with tsx (no build needed)
npm run build  # Compile TypeScript to dist/
npm start      # Run compiled dist/index.js
```

## Security Considerations

- **Token storage**: The Discord user token grants full access to the account. Treat it like a password — do not commit it to version control.
- **Account access**: The server can read/send messages, manage servers, modify roles, ban users, and access DMs and friend lists — anything the account can do.
- **No rate limiting**: The server does not implement its own rate limiting. Discord's built-in rate limits apply via discord.js, but aggressive usage may flag the account.
- **TOS risk**: Selfbots violate Discord's Terms of Service. Accounts using this tool may be terminated without warning.

## License

MIT — Copyright (c) 2026 TylerFlar
