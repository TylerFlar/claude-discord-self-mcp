import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatChannel } from "../helpers.js";

export function registerChannelTools(server: McpServer) {
  server.tool(
    "discord_list_channels",
    "List all channels in a Discord server",
    { guildId: z.string() },
    async ({ guildId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();
        return toolResult(
          channels.map((ch) => (ch ? formatChannel(ch as any) : null)).filter(Boolean)
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_channel_info",
    "Get detailed information about a channel",
    { channelId: z.string() },
    async ({ channelId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel) throw new Error("Channel not found");
        return toolResult(formatChannel(channel as any));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_create_channel",
    "Create a new channel in a server",
    {
      guildId: z.string(),
      name: z.string(),
      type: z.enum(["GUILD_TEXT", "GUILD_VOICE", "GUILD_CATEGORY"]).default("GUILD_TEXT").optional(),
      parentId: z.string().optional(),
      topic: z.string().optional(),
    },
    async ({ guildId, name, type, parentId, topic }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const options: Record<string, unknown> = {
          name,
          type: type ?? "GUILD_TEXT",
        };
        if (parentId) options.parent = parentId;
        if (topic) options.topic = topic;
        const channel = await guild.channels.create(name, options as any);
        return toolResult(formatChannel(channel));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_edit_channel",
    "Edit a channel's properties (name, topic, nsfw, slowmode)",
    {
      channelId: z.string(),
      name: z.string().optional(),
      topic: z.string().optional(),
      nsfw: z.boolean().optional(),
      slowmode: z.number().min(0).max(21600).optional(),
    },
    async ({ channelId, name, topic, nsfw, slowmode }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !("edit" in channel)) throw new Error("Channel not found or not editable");
        const options: Record<string, unknown> = {};
        if (name !== undefined) options.name = name;
        if (topic !== undefined) options.topic = topic;
        if (nsfw !== undefined) options.nsfw = nsfw;
        if (slowmode !== undefined) options.rateLimitPerUser = slowmode;
        const edited = await (channel as any).edit(options);
        return toolResult(formatChannel(edited));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_delete_channel",
    "Delete a channel from a server",
    { channelId: z.string() },
    async ({ channelId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !("delete" in channel)) throw new Error("Channel not found or not deletable");
        const name = "name" in channel ? (channel as any).name : channelId;
        await (channel as any).delete();
        return toolResult({ deleted: true, channelId, name });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_set_channel_permissions",
    "Set permission overwrite for a role or user on a channel",
    {
      channelId: z.string(),
      targetId: z.string().describe("Role or user ID"),
      targetType: z.enum(["role", "member"]),
      allow: z.string().optional().describe("Permission bitfield to allow"),
      deny: z.string().optional().describe("Permission bitfield to deny"),
    },
    async ({ channelId, targetId, targetType, allow, deny }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !("permissionOverwrites" in channel))
          throw new Error("Channel not found or does not support permissions");
        const ch = channel as any;
        await ch.permissionOverwrites.edit(targetId, {
          ...(allow && { allow: BigInt(allow) }),
          ...(deny && { deny: BigInt(deny) }),
        }, { type: targetType === "role" ? 0 : 1 });
        return toolResult({ updated: true, channelId, targetId, targetType });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
