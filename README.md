# claude-discord-self-mcp

A comprehensive MCP (Model Context Protocol) server that gives Claude Code full access to Discord through a user account (selfbot). Provides 64 tools across 15 categories covering messages, DMs, servers, channels, threads, moderation, and more.

> **Warning:** Using selfbots violates Discord's Terms of Service. Your account may be suspended or terminated. Use at your own risk for personal use only.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Get your Discord token

1. Open Discord in a browser
2. Press `F12` to open DevTools
3. Go to the **Network** tab
4. Send a message or perform any action
5. Find a request to `discord.com/api`
6. Copy the `Authorization` header value — that's your user token

### 4. Configure in Claude Code

Add to your Claude Code MCP settings (`claude_desktop_config.json` or project settings):

```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["/path/to/claude-discord-self-mcp/dist/index.js"],
      "env": {
        "DISCORD_TOKEN": "your_discord_user_token_here"
      }
    }
  }
}
```

## Tools

### Messages (9 tools)
| Tool | Description |
|---|---|
| `discord_send_message` | Send a message to a channel |
| `discord_read_messages` | Read recent messages from a channel |
| `discord_edit_message` | Edit one of your own messages |
| `discord_delete_message` | Delete a message |
| `discord_reply_to_message` | Reply to a specific message |
| `discord_pin_message` | Pin a message |
| `discord_unpin_message` | Unpin a message |
| `discord_get_pinned_messages` | List all pinned messages |
| `discord_search_messages` | Search messages in a server |

### DMs (4 tools)
| Tool | Description |
|---|---|
| `discord_open_dm` | Open or get a DM channel with a user |
| `discord_list_dms` | List recent DM channels |
| `discord_read_dm_history` | Read DM message history |
| `discord_send_dm` | Send a direct message |

### Servers (5 tools)
| Tool | Description |
|---|---|
| `discord_list_guilds` | List all servers |
| `discord_guild_info` | Get server details |
| `discord_list_members` | List server members |
| `discord_search_members` | Search members by name |
| `discord_leave_guild` | Leave a server |

### Channels (6 tools)
| Tool | Description |
|---|---|
| `discord_list_channels` | List all channels in a server |
| `discord_channel_info` | Get channel details |
| `discord_create_channel` | Create a text/voice/category channel |
| `discord_edit_channel` | Edit channel properties |
| `discord_delete_channel` | Delete a channel |
| `discord_set_channel_permissions` | Set permission overwrites |

### Threads (6 tools)
| Tool | Description |
|---|---|
| `discord_create_thread` | Create a thread (standalone or from message) |
| `discord_list_threads` | List active threads |
| `discord_list_archived_threads` | List archived threads |
| `discord_join_thread` | Join a thread |
| `discord_leave_thread` | Leave a thread |
| `discord_archive_thread` | Archive/lock a thread |

### Reactions (4 tools)
| Tool | Description |
|---|---|
| `discord_add_reaction` | Add a reaction to a message |
| `discord_remove_reaction` | Remove your reaction |
| `discord_list_reactions` | List users who reacted |
| `discord_clear_reactions` | Remove all reactions |

### Users (7 tools)
| Tool | Description |
|---|---|
| `discord_user_info` | Get user info by ID |
| `discord_my_profile` | Get your own profile |
| `discord_list_friends` | List all friends |
| `discord_list_blocked` | List blocked users |
| `discord_send_friend_request` | Send a friend request |
| `discord_remove_friend` | Remove a friend |
| `discord_guild_member_info` | Get member's server profile |

### Roles (6 tools)
| Tool | Description |
|---|---|
| `discord_list_roles` | List all roles in a server |
| `discord_role_info` | Get role details |
| `discord_assign_role` | Add a role to a member |
| `discord_remove_role` | Remove a role from a member |
| `discord_create_role` | Create a new role |
| `discord_delete_role` | Delete a role |

### Moderation (7 tools)
| Tool | Description |
|---|---|
| `discord_kick_member` | Kick a member |
| `discord_ban_member` | Ban a member |
| `discord_unban_member` | Unban a user |
| `discord_timeout_member` | Timeout/mute a member |
| `discord_remove_timeout` | Remove a timeout |
| `discord_purge_messages` | Bulk delete messages |
| `discord_list_bans` | List banned users |

### Presence (4 tools)
| Tool | Description |
|---|---|
| `discord_set_status` | Set online/idle/dnd/invisible |
| `discord_set_custom_status` | Set custom status text/emoji |
| `discord_set_activity` | Set playing/streaming/listening/watching |
| `discord_clear_activity` | Clear all activities |

### Invites (4 tools)
| Tool | Description |
|---|---|
| `discord_create_invite` | Create a channel invite |
| `discord_list_invites` | List server invites |
| `discord_delete_invite` | Revoke an invite |
| `discord_accept_invite` | Join a server via invite |

### Webhooks (4 tools)
| Tool | Description |
|---|---|
| `discord_list_webhooks` | List webhooks |
| `discord_create_webhook` | Create a webhook |
| `discord_send_webhook` | Send a message via webhook |
| `discord_delete_webhook` | Delete a webhook |

### Emojis & Stickers (2 tools)
| Tool | Description |
|---|---|
| `discord_list_emojis` | List custom server emojis |
| `discord_list_stickers` | List server stickers |

### Attachments (2 tools)
| Tool | Description |
|---|---|
| `discord_send_attachment` | Send a file by URL |
| `discord_send_embed` | Send a rich embed message |

### Voice (1 tool)
| Tool | Description |
|---|---|
| `discord_list_voice_members` | List members in a voice channel |

## Development

```bash
# Run in dev mode (no build needed)
npm run dev

# Build for production
npm run build

# Run built version
npm start
```

## License

MIT
