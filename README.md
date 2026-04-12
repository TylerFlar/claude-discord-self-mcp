# @tasque/discord-self-mcp

MCP server for Discord selfbot capabilities via discord.js-selfbot-v13.

> **Warning** — Uses a user account token, which violates Discord's Terms of Service. Your account may be suspended or terminated.

## Tools

| Tool | Description |
|------|-------------|
| `discord_send_message` | Send a message to a channel |
| `discord_read_messages` | Read recent messages from a channel |
| `discord_edit_message` | Edit one of your own messages |
| `discord_delete_message` | Delete a message |
| `discord_reply_to_message` | Reply to a specific message |
| `discord_pin_message` | Pin a message |
| `discord_unpin_message` | Unpin a message |
| `discord_get_pinned_messages` | Get all pinned messages in a channel |
| `discord_search_messages` | Search messages in a server |
| `discord_open_dm` | Open or get a DM channel with a user |
| `discord_list_dms` | List recent DM channels |
| `discord_read_dm_history` | Read DM message history |
| `discord_send_dm` | Send a direct message |
| `discord_list_guilds` | List all servers |
| `discord_guild_info` | Get server details |
| `discord_list_members` | List server members |
| `discord_search_members` | Search members by name |
| `discord_leave_guild` | Leave a server |
| `discord_list_channels` | List channels in a server |
| `discord_channel_info` | Get channel details |
| `discord_create_channel` | Create a new channel |
| `discord_edit_channel` | Edit channel properties |
| `discord_delete_channel` | Delete a channel |
| `discord_set_channel_permissions` | Set permission overwrite |
| `discord_create_thread` | Create a thread |
| `discord_list_threads` | List active threads |
| `discord_list_archived_threads` | List archived threads |
| `discord_join_thread` | Join a thread |
| `discord_leave_thread` | Leave a thread |
| `discord_archive_thread` | Archive a thread |
| `discord_add_reaction` | Add a reaction |
| `discord_remove_reaction` | Remove your reaction |
| `discord_list_reactions` | List users who reacted |
| `discord_clear_reactions` | Remove all reactions |
| `discord_user_info` | Get user info by ID |
| `discord_my_profile` | Get authenticated user's profile |
| `discord_list_friends` | List all friends |
| `discord_list_blocked` | List blocked users |
| `discord_send_friend_request` | Send a friend request |
| `discord_remove_friend` | Remove a friend |
| `discord_guild_member_info` | Get server-specific member profile |
| `discord_list_roles` | List server roles |
| `discord_role_info` | Get role details |
| `discord_assign_role` | Add a role to a member |
| `discord_remove_role` | Remove a role from a member |
| `discord_create_role` | Create a new role |
| `discord_delete_role` | Delete a role |
| `discord_kick_member` | Kick a member |
| `discord_ban_member` | Ban a member |
| `discord_unban_member` | Unban a user |
| `discord_timeout_member` | Timeout a member |
| `discord_remove_timeout` | Remove a timeout |
| `discord_purge_messages` | Bulk delete messages |
| `discord_list_bans` | List banned users |
| `discord_set_status` | Set online status |
| `discord_set_custom_status` | Set custom status text/emoji |
| `discord_set_activity` | Set an activity |
| `discord_clear_activity` | Clear all activities |
| `discord_create_invite` | Create an invite |
| `discord_list_invites` | List server invites |
| `discord_delete_invite` | Revoke an invite |
| `discord_accept_invite` | Join via invite code |
| `discord_list_webhooks` | List webhooks |
| `discord_create_webhook` | Create a webhook |
| `discord_send_webhook` | Send via webhook |
| `discord_delete_webhook` | Delete a webhook |
| `discord_list_emojis` | List custom emojis |
| `discord_list_stickers` | List stickers |
| `discord_send_attachment` | Send a file by URL |
| `discord_send_embed` | Send a rich embed |
| `discord_list_voice_members` | List voice channel members |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Discord user account token |

## Auth Setup

Open Discord in a browser, open DevTools (F12), go to the Network tab, find any request to `discord.com/api`, and copy the `Authorization` header value.

## Development

```bash
npm install
npm run build
npm start        # stdio mode
```
