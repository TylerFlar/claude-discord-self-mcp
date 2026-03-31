import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatGuild, formatMember } from "../helpers.js";

export function registerGuildTools(server: McpServer) {
  server.tool(
    "discord_list_guilds",
    "List all Discord servers the account is in",
    {},
    async () => {
      try {
        const client = await getClient();
        const guilds = client.guilds.cache.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.iconURL(),
          memberCount: g.memberCount,
          ownerId: g.ownerId,
        }));
        return toolResult(guilds);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_guild_info",
    "Get detailed information about a Discord server",
    { guildId: z.string() },
    async ({ guildId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        return toolResult(formatGuild(guild));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_members",
    "List members of a Discord server",
    {
      guildId: z.string(),
      limit: z.number().min(1).max(100).default(50).optional(),
      after: z.string().optional(),
    },
    async ({ guildId, limit, after }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const options: { limit?: number; after?: string } = { limit: limit ?? 50 };
        if (after) options.after = after;
        const members = await guild.members.fetch(options);
        return toolResult(members.map(formatMember));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_search_members",
    "Search server members by username or nickname",
    {
      guildId: z.string(),
      query: z.string(),
      limit: z.number().min(1).max(100).default(20).optional(),
    },
    async ({ guildId, query, limit }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const members = await guild.members.fetch({ query, limit: limit ?? 20 });
        return toolResult(members.map(formatMember));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_leave_guild",
    "Leave a Discord server",
    { guildId: z.string() },
    async ({ guildId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        await guild.leave();
        return toolResult({ left: true, guildId, name: guild.name });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
