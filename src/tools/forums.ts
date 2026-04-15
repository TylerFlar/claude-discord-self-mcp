import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatMessage } from "../helpers.js";

function formatThread(t: any) {
  return {
    id: t.id,
    name: t.name,
    parentId: t.parentId,
    archived: t.archived,
    locked: t.locked,
    appliedTags: t.appliedTags ?? [],
    messageCount: t.messageCount,
    memberCount: t.memberCount,
    createdAt: t.createdAt?.toISOString?.() ?? null,
    lastMessageId: t.lastMessageId ?? null,
  };
}

function isForumChannel(ch: any): boolean {
  return ch?.type === "GUILD_FORUM" || ch?.type === 15;
}

export function registerForumTools(server: McpServer) {
  server.tool(
    "discord_create_forum_post",
    "Create a new post (thread) in a forum channel with an initial message",
    {
      channelId: z.string().describe("Forum channel ID"),
      name: z.string(),
      content: z.string(),
      appliedTags: z.array(z.string()).optional().describe("Tag IDs to apply"),
      autoArchiveDuration: z.enum(["60", "1440", "4320", "10080"]).default("1440").optional(),
    },
    async ({ channelId, name, content, appliedTags, autoArchiveDuration }) => {
      try {
        const client = await getClient();
        const channel: any = await client.channels.fetch(channelId);
        if (!isForumChannel(channel)) throw new Error("Channel is not a forum channel");
        const thread = await channel.threads.create({
          name,
          autoArchiveDuration: parseInt(autoArchiveDuration ?? "1440"),
          message: { content },
          ...(appliedTags && { appliedTags }),
        });
        return toolResult(formatThread(thread));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_forum_threads",
    "List active and archived forum posts in a forum channel",
    {
      channelId: z.string(),
      includeArchived: z.boolean().default(true).optional(),
      limit: z.number().min(1).max(100).default(50).optional(),
    },
    async ({ channelId, includeArchived, limit }) => {
      try {
        const client = await getClient();
        const channel: any = await client.channels.fetch(channelId);
        if (!isForumChannel(channel)) throw new Error("Channel is not a forum channel");
        const active = await channel.threads.fetchActive();
        const posts = Array.from(active.threads.values()).map(formatThread);
        if (includeArchived ?? true) {
          const archived = await channel.threads.fetchArchived({ type: "public", limit: limit ?? 50 });
          for (const t of archived.threads.values()) posts.push(formatThread(t));
        }
        return toolResult(posts.slice(0, limit ?? 50));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_get_forum_post",
    "Get a forum post with its first message and metadata",
    { threadId: z.string() },
    async ({ threadId }) => {
      try {
        const client = await getClient();
        const thread: any = await client.channels.fetch(threadId);
        if (!thread?.isThread?.()) throw new Error("Not a thread");
        const starter = await thread.fetchStarterMessage?.().catch(() => null);
        return toolResult({
          thread: formatThread(thread),
          starterMessage: starter ? formatMessage(starter) : null,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_forum_tags",
    "List available tags on a forum channel",
    { channelId: z.string() },
    async ({ channelId }) => {
      try {
        const client = await getClient();
        const channel: any = await client.channels.fetch(channelId);
        if (!isForumChannel(channel)) throw new Error("Channel is not a forum channel");
        const tags = (channel.availableTags ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          emoji: t.emoji ?? null,
          moderated: t.moderated,
        }));
        return toolResult(tags);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_edit_forum_post",
    "Update a forum post's tags, name, or archived/locked state",
    {
      threadId: z.string(),
      name: z.string().optional(),
      appliedTags: z.array(z.string()).optional(),
      archived: z.boolean().optional(),
      locked: z.boolean().optional(),
    },
    async ({ threadId, name, appliedTags, archived, locked }) => {
      try {
        const client = await getClient();
        const thread: any = await client.channels.fetch(threadId);
        if (!thread?.isThread?.()) throw new Error("Not a thread");
        const edits: any = {};
        if (name !== undefined) edits.name = name;
        if (appliedTags !== undefined) edits.appliedTags = appliedTags;
        if (archived !== undefined) edits.archived = archived;
        if (locked !== undefined) edits.locked = locked;
        await thread.edit(edits);
        return toolResult(formatThread(thread));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_delete_forum_post",
    "Delete a forum post (thread)",
    { threadId: z.string() },
    async ({ threadId }) => {
      try {
        const client = await getClient();
        const thread: any = await client.channels.fetch(threadId);
        if (!thread?.isThread?.()) throw new Error("Not a thread");
        await thread.delete();
        return toolResult({ deleted: true, threadId });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
