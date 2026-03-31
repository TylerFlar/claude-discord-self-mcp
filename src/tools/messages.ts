import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatMessage } from "../helpers.js";
import { TextChannel } from "discord.js-selfbot-v13";

export function registerMessageTools(server: McpServer) {
  server.tool(
    "discord_send_message",
    "Send a message to a Discord channel",
    { channelId: z.string(), content: z.string() },
    async ({ channelId, content }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const msg = await channel.send(content);
        return toolResult(formatMessage(msg));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_read_messages",
    "Read recent messages from a Discord channel",
    {
      channelId: z.string(),
      limit: z.number().min(1).max(100).default(25).optional(),
      before: z.string().optional(),
      after: z.string().optional(),
    },
    async ({ channelId, limit, before, after }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const options: { limit?: number; before?: string; after?: string } = { limit: limit ?? 25 };
        if (before) options.before = before;
        if (after) options.after = after;
        const messages = await channel.messages.fetch(options);
        return toolResult(messages.map(formatMessage));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_edit_message",
    "Edit one of your own messages",
    { channelId: z.string(), messageId: z.string(), content: z.string() },
    async ({ channelId, messageId, content }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const msg = await channel.messages.fetch(messageId);
        const edited = await msg.edit(content);
        return toolResult(formatMessage(edited));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_delete_message",
    "Delete a message in a channel",
    { channelId: z.string(), messageId: z.string() },
    async ({ channelId, messageId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const msg = await channel.messages.fetch(messageId);
        await msg.delete();
        return toolResult({ deleted: true, messageId });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_reply_to_message",
    "Reply to a specific message in a channel",
    {
      channelId: z.string(),
      messageId: z.string(),
      content: z.string(),
      mention: z.boolean().default(true).optional(),
    },
    async ({ channelId, messageId, content, mention }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const targetMsg = await channel.messages.fetch(messageId);
        const reply = await targetMsg.reply({
          content,
          allowedMentions: { repliedUser: mention ?? true },
        });
        return toolResult(formatMessage(reply));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_pin_message",
    "Pin a message in a channel",
    { channelId: z.string(), messageId: z.string() },
    async ({ channelId, messageId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const msg = await channel.messages.fetch(messageId);
        await msg.pin();
        return toolResult({ pinned: true, messageId });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_unpin_message",
    "Unpin a message in a channel",
    { channelId: z.string(), messageId: z.string() },
    async ({ channelId, messageId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const msg = await channel.messages.fetch(messageId);
        await msg.unpin();
        return toolResult({ unpinned: true, messageId });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_get_pinned_messages",
    "Get all pinned messages in a channel",
    { channelId: z.string() },
    async ({ channelId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const pinned = await channel.messages.fetchPinned();
        return toolResult(pinned.map(formatMessage));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_search_messages",
    "Search messages in a server using Discord's search API",
    {
      guildId: z.string(),
      query: z.string(),
      authorId: z.string().optional(),
      channelId: z.string().optional(),
      has: z.enum(["link", "embed", "file", "video", "image", "sound", "sticker"]).optional(),
      limit: z.number().min(1).max(100).default(25).optional(),
    },
    async ({ guildId, query, authorId, channelId, has, limit }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        // Use the REST API for search since discord.js-selfbot-v13 supports it
        const searchParams: Record<string, string> = { content: query };
        if (authorId) searchParams.author_id = authorId;
        if (channelId) searchParams.channel_id = channelId;
        if (has) searchParams.has = has;
        const searchLimit = limit ?? 25;

        // discord.js-selfbot-v13 exposes guild.search or we use the API directly
        const result = await (guild as any).search({
          content: query,
          limit: searchLimit,
          ...(authorId && { authors: [authorId] }),
          ...(channelId && { channels: [channelId] }),
          ...(has && { has: [has] }),
        });

        const messages = result.messages?.flat?.() ?? result;
        const formatted = Array.isArray(messages)
          ? messages.map((m: any) => ({
              id: m.id,
              channelId: m.channel_id ?? m.channelId,
              author: { id: m.author?.id, username: m.author?.username },
              content: m.content,
              timestamp: m.timestamp ?? m.createdTimestamp,
            }))
          : messages;

        return toolResult(formatted);
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
