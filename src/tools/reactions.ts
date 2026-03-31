import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError } from "../helpers.js";

export function registerReactionTools(server: McpServer) {
  server.tool(
    "discord_add_reaction",
    "Add a reaction emoji to a message (use unicode emoji or custom format name:id)",
    { channelId: z.string(), messageId: z.string(), emoji: z.string() },
    async ({ channelId, messageId, emoji }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const msg = await channel.messages.fetch(messageId);
        await msg.react(emoji);
        return toolResult({ reacted: true, messageId, emoji });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_remove_reaction",
    "Remove your reaction from a message",
    { channelId: z.string(), messageId: z.string(), emoji: z.string() },
    async ({ channelId, messageId, emoji }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const msg = await channel.messages.fetch(messageId);
        const reaction = msg.reactions.cache.find(
          (r) => r.emoji.name === emoji || r.emoji.toString() === emoji
        );
        if (!reaction) throw new Error("Reaction not found");
        await reaction.users.remove(client.user!.id);
        return toolResult({ removed: true, messageId, emoji });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_reactions",
    "List users who reacted with a specific emoji on a message",
    {
      channelId: z.string(),
      messageId: z.string(),
      emoji: z.string(),
      limit: z.number().min(1).max(100).default(25).optional(),
    },
    async ({ channelId, messageId, emoji, limit }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const msg = await channel.messages.fetch(messageId);
        const reaction = msg.reactions.cache.find(
          (r) => r.emoji.name === emoji || r.emoji.toString() === emoji
        );
        if (!reaction) throw new Error("Reaction not found");
        const users = await reaction.users.fetch({ limit: limit ?? 25 });
        return toolResult(
          users.map((u) => ({ id: u.id, username: u.username, discriminator: u.discriminator }))
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_clear_reactions",
    "Remove all reactions from a message",
    { channelId: z.string(), messageId: z.string() },
    async ({ channelId, messageId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const msg = await channel.messages.fetch(messageId);
        await msg.reactions.removeAll();
        return toolResult({ cleared: true, messageId });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
