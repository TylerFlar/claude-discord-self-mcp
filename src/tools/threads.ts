import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatChannel } from "../helpers.js";

export function registerThreadTools(server: McpServer) {
  server.tool(
    "discord_create_thread",
    "Create a new thread in a channel (optionally from a message)",
    {
      channelId: z.string(),
      name: z.string(),
      messageId: z.string().optional().describe("Message ID to create thread from"),
      autoArchiveDuration: z.enum(["60", "1440", "4320", "10080"]).default("1440").optional(),
    },
    async ({ channelId, name, messageId, autoArchiveDuration }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");

        const options: any = {
          name,
          autoArchiveDuration: parseInt(autoArchiveDuration ?? "1440"),
        };

        let thread;
        if (messageId) {
          const message = await channel.messages.fetch(messageId);
          thread = await message.startThread(options);
        } else {
          thread = await (channel as any).threads.create(options);
        }

        return toolResult(formatChannel(thread));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_threads",
    "List active threads in a channel",
    { channelId: z.string() },
    async ({ channelId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !("threads" in channel)) throw new Error("Channel does not support threads");
        const threads = await (channel as any).threads.fetchActive();
        return toolResult(
          threads.threads.map((t: any) => ({
            id: t.id,
            name: t.name,
            archived: t.archived,
            locked: t.locked,
            messageCount: t.messageCount,
            memberCount: t.memberCount,
            createdAt: t.createdAt?.toISOString(),
          }))
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_archived_threads",
    "List archived threads in a channel",
    {
      channelId: z.string(),
      type: z.enum(["public", "private"]).default("public").optional(),
      limit: z.number().min(1).max(100).default(25).optional(),
    },
    async ({ channelId, type, limit }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !("threads" in channel)) throw new Error("Channel does not support threads");
        const fetchFn = (type ?? "public") === "public"
          ? (channel as any).threads.fetchArchived({ type: "public", limit: limit ?? 25 })
          : (channel as any).threads.fetchArchived({ type: "private", limit: limit ?? 25 });
        const threads = await fetchFn;
        return toolResult(
          threads.threads.map((t: any) => ({
            id: t.id,
            name: t.name,
            archived: t.archived,
            locked: t.locked,
            messageCount: t.messageCount,
            archiveTimestamp: t.archiveTimestamp,
          }))
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_join_thread",
    "Join a thread",
    { threadId: z.string() },
    async ({ threadId }) => {
      try {
        const client = await getClient();
        const thread = await client.channels.fetch(threadId);
        if (!thread?.isThread()) throw new Error("Not a thread");
        await thread.join();
        return toolResult({ joined: true, threadId, name: thread.name });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_leave_thread",
    "Leave a thread",
    { threadId: z.string() },
    async ({ threadId }) => {
      try {
        const client = await getClient();
        const thread = await client.channels.fetch(threadId);
        if (!thread?.isThread()) throw new Error("Not a thread");
        await thread.leave();
        return toolResult({ left: true, threadId, name: thread.name });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_archive_thread",
    "Archive (and optionally lock) a thread",
    {
      threadId: z.string(),
      locked: z.boolean().default(false).optional(),
    },
    async ({ threadId, locked }) => {
      try {
        const client = await getClient();
        const thread = await client.channels.fetch(threadId);
        if (!thread?.isThread()) throw new Error("Not a thread");
        await thread.setArchived(true);
        if (locked) await thread.setLocked(true);
        return toolResult({ archived: true, locked: locked ?? false, threadId, name: thread.name });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
