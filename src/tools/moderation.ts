import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError } from "../helpers.js";

export function registerModerationTools(server: McpServer) {
  server.tool(
    "discord_kick_member",
    "Kick a member from a server",
    {
      guildId: z.string(),
      userId: z.string(),
      reason: z.string().optional(),
    },
    async ({ guildId, userId, reason }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.kick(reason);
        return toolResult({ kicked: true, userId, username: member.user.username });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_ban_member",
    "Ban a member from a server",
    {
      guildId: z.string(),
      userId: z.string(),
      reason: z.string().optional(),
      deleteMessageDays: z.number().min(0).max(7).default(0).optional(),
    },
    async ({ guildId, userId, reason, deleteMessageDays }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        await guild.members.ban(userId, {
          reason,
          days: deleteMessageDays ?? 0,
        });
        return toolResult({ banned: true, userId });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_unban_member",
    "Unban a user from a server",
    { guildId: z.string(), userId: z.string() },
    async ({ guildId, userId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        await guild.members.unban(userId);
        return toolResult({ unbanned: true, userId });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_timeout_member",
    "Timeout (mute) a server member for a duration",
    {
      guildId: z.string(),
      userId: z.string(),
      duration: z.number().min(1).max(2419200).describe("Duration in seconds (max 28 days)"),
      reason: z.string().optional(),
    },
    async ({ guildId, userId, duration, reason }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.timeout(duration * 1000, reason);
        return toolResult({ timedOut: true, userId, duration, username: member.user.username });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_remove_timeout",
    "Remove timeout from a server member",
    { guildId: z.string(), userId: z.string() },
    async ({ guildId, userId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.timeout(null);
        return toolResult({ timeoutRemoved: true, userId, username: member.user.username });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_purge_messages",
    "Bulk delete recent messages in a channel (2-100 messages, max 14 days old)",
    {
      channelId: z.string(),
      count: z.number().min(2).max(100),
      userId: z.string().optional().describe("Filter messages by this author"),
    },
    async ({ channelId, count, userId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");

        let messages = await channel.messages.fetch({ limit: userId ? 100 : count });
        if (userId) {
          messages = messages.filter((m) => m.author.id === userId);
          messages = messages.first(count) as any;
        }

        const deleted = await (channel as any).bulkDelete(messages, true);
        return toolResult({ deleted: deleted.size, channelId });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_bans",
    "List banned users in a server",
    {
      guildId: z.string(),
      limit: z.number().min(1).max(1000).default(100).optional(),
    },
    async ({ guildId, limit }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const bans = await guild.bans.fetch({ limit: limit ?? 100 });
        return toolResult(
          bans.map((ban) => ({
            userId: ban.user.id,
            username: ban.user.username,
            discriminator: ban.user.discriminator,
            reason: ban.reason,
          }))
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
