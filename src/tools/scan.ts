import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError } from "../helpers.js";
import {
  upsertChannel,
  upsertMessages,
  setChannelIndexedAt,
  searchIndexed,
  stats,
  type MessageRow,
  type AttachmentRow,
} from "../store.js";

type ScanSummary = {
  channelId: string;
  channelName?: string | null;
  messagesIndexed: number;
  attachmentsIndexed: number;
  oldestTimestamp?: number;
  newestTimestamp?: number;
  stoppedReason?: string;
};

async function scanChannel(
  client: any,
  channelId: string,
  opts: { limitPerChannel?: number; since?: number; until?: number; isDm: boolean; guildId?: string | null; channelName?: string | null }
): Promise<ScanSummary> {
  const channel: any = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || typeof channel.messages?.fetch !== "function") {
    return {
      channelId,
      channelName: opts.channelName ?? null,
      messagesIndexed: 0,
      attachmentsIndexed: 0,
      stoppedReason: "channel_unfetchable",
    };
  }

  const cap = opts.limitPerChannel ?? 500;
  let before: string | undefined = undefined;
  let total = 0;
  let attTotal = 0;
  let oldest: number | undefined;
  let newest: number | undefined;
  let stopped: string | undefined;

  while (total < cap) {
    const batchSize = Math.min(100, cap - total);
    const batch: any = await channel.messages
      .fetch({ limit: batchSize, before })
      .catch((err: any) => {
        stopped = `fetch_error:${err?.message ?? err}`;
        return null;
      });
    if (!batch || batch.size === 0) break;

    const msgs = Array.from(batch.values()) as any[];
    const rows: MessageRow[] = [];
    const attachments: AttachmentRow[] = [];
    let exitedDueToSince = false;

    for (const m of msgs) {
      const ts = m.createdTimestamp as number;
      if (opts.until !== undefined && ts > opts.until) continue;
      if (opts.since !== undefined && ts < opts.since) {
        exitedDueToSince = true;
        continue;
      }
      rows.push({
        id: m.id,
        channel_id: channelId,
        guild_id: opts.guildId ?? null,
        author_id: m.author.id,
        author_username: m.author.username,
        content: m.content ?? "",
        created_at: ts,
        edited_at: m.editedTimestamp ?? null,
        has_attachments: m.attachments?.size ? 1 : 0,
        is_dm: opts.isDm ? 1 : 0,
        reference_message_id: m.reference?.messageId ?? null,
      });
      if (m.attachments?.size) {
        for (const a of m.attachments.values() as any) {
          attachments.push({
            id: a.id,
            message_id: m.id,
            url: a.url,
            filename: a.name,
            size: a.size,
            content_type: a.contentType,
          });
        }
      }
      if (oldest === undefined || ts < oldest) oldest = ts;
      if (newest === undefined || ts > newest) newest = ts;
    }

    upsertMessages(rows, attachments);
    total += rows.length;
    attTotal += attachments.length;

    if (exitedDueToSince) {
      stopped = "reached_since";
      break;
    }

    const last = msgs[msgs.length - 1];
    if (!last) break;
    before = last.id;
    if (batch.size < batchSize) break;
  }

  setChannelIndexedAt(channelId, Date.now());
  return {
    channelId,
    channelName: opts.channelName ?? channel?.name ?? null,
    messagesIndexed: total,
    attachmentsIndexed: attTotal,
    oldestTimestamp: oldest,
    newestTimestamp: newest,
    stoppedReason: stopped,
  };
}

export function registerScanTools(server: McpServer) {
  server.tool(
    "discord_fetch_all_dm_channels",
    "Enumerate every open DM + group DM live from the API and upsert into the local index",
    {},
    async () => {
      try {
        const client = await getClient();
        const raw = await (client as any).api.users("@me").channels.get();
        const list = (Array.isArray(raw) ? raw : []).map((c: any) => {
          const recipients = (c.recipients ?? []).map((r: any) => ({
            id: r.id,
            username: r.username,
            discriminator: r.discriminator,
            globalName: r.global_name,
          }));
          const isGroup = c.type === 3;
          const primary = recipients[0];
          upsertChannel({
            id: c.id,
            type: isGroup ? "GROUP_DM" : "DM",
            name: c.name ?? (primary?.username ?? null),
            guild_id: null,
            recipient_id: isGroup ? null : primary?.id ?? null,
            last_indexed_at: null,
          });
          return {
            channelId: c.id,
            type: isGroup ? "GROUP_DM" : "DM",
            name: c.name ?? null,
            recipients,
            lastMessageId: c.last_message_id ?? null,
          };
        });
        return toolResult({ count: list.length, channels: list });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_scan_dms",
    "Walk every DM channel and index messages into SQLite. Returns per-channel summaries.",
    {
      limitPerDm: z.number().min(1).max(5000).default(200).optional(),
      since: z.number().optional().describe("Unix ms; skip messages older than this"),
      until: z.number().optional().describe("Unix ms; skip messages newer than this"),
      channelIds: z.array(z.string()).optional().describe("Restrict to these DM channel IDs"),
    },
    async ({ limitPerDm, since, until, channelIds }) => {
      try {
        const client = await getClient();
        const raw = await (client as any).api.users("@me").channels.get();
        const dmChannels = (Array.isArray(raw) ? raw : []).filter((c: any) =>
          channelIds ? channelIds.includes(c.id) : true
        );

        for (const c of dmChannels) {
          const recipients = c.recipients ?? [];
          const primary = recipients[0];
          upsertChannel({
            id: c.id,
            type: c.type === 3 ? "GROUP_DM" : "DM",
            name: c.name ?? primary?.username ?? null,
            guild_id: null,
            recipient_id: c.type === 3 ? null : primary?.id ?? null,
          });
        }

        const summaries: ScanSummary[] = [];
        for (const c of dmChannels) {
          const summary = await scanChannel(client, c.id, {
            limitPerChannel: limitPerDm ?? 200,
            since,
            until,
            isDm: true,
            guildId: null,
            channelName: c.name ?? c.recipients?.[0]?.username ?? null,
          });
          summaries.push(summary);
        }

        const totalMessages = summaries.reduce((n, s) => n + s.messagesIndexed, 0);
        return toolResult({
          channelsScanned: summaries.length,
          totalMessagesIndexed: totalMessages,
          summaries,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_scan_guild",
    "Walk every text channel in a guild (or a subset) and index into SQLite",
    {
      guildId: z.string(),
      channelIds: z.array(z.string()).optional(),
      limitPerChannel: z.number().min(1).max(5000).default(200).optional(),
      since: z.number().optional(),
      until: z.number().optional(),
    },
    async ({ guildId, channelIds, limitPerChannel, since, until }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const channels = guild.channels.cache.filter((ch: any) => {
          if (channelIds && !channelIds.includes(ch.id)) return false;
          return typeof ch?.messages?.fetch === "function" && ch.isText?.();
        });

        for (const ch of channels.values()) {
          upsertChannel({
            id: ch.id,
            type: String(ch.type),
            name: (ch as any).name ?? null,
            guild_id: guildId,
            recipient_id: null,
          });
        }

        const summaries: ScanSummary[] = [];
        for (const ch of channels.values()) {
          const summary = await scanChannel(client, ch.id, {
            limitPerChannel: limitPerChannel ?? 200,
            since,
            until,
            isDm: false,
            guildId,
            channelName: (ch as any).name ?? null,
          });
          summaries.push(summary);
        }

        const totalMessages = summaries.reduce((n, s) => n + s.messagesIndexed, 0);
        return toolResult({
          guildId,
          channelsScanned: summaries.length,
          totalMessagesIndexed: totalMessages,
          summaries,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_search_indexed",
    "Full-text search the local SQLite index (DMs + guild history). Empty query returns recent messages.",
    {
      query: z.string().default("").optional(),
      scope: z.enum(["dms", "guild", "all"]).default("all").optional(),
      guildId: z.string().optional(),
      channelId: z.string().optional(),
      authorId: z.string().optional(),
      hasAttachments: z.boolean().optional(),
      since: z.number().optional(),
      until: z.number().optional(),
      limit: z.number().min(1).max(500).default(50).optional(),
    },
    async (args) => {
      try {
        const rows = searchIndexed(args.query ?? "", {
          scope: args.scope,
          guildId: args.guildId,
          channelId: args.channelId,
          authorId: args.authorId,
          hasAttachments: args.hasAttachments,
          since: args.since,
          until: args.until,
          limit: args.limit,
        });
        return toolResult(
          rows.map((r: any) => ({
            messageId: r.id,
            channelId: r.channel_id,
            guildId: r.guild_id,
            authorId: r.author_id,
            author: r.author_username,
            content: r.content,
            timestamp: r.created_at,
            isDm: !!r.is_dm,
            hasAttachments: !!r.has_attachments,
            snippet: r.snippet,
          }))
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_search_dm_messages",
    "Live keyword search within a single DM (walks history; use for small date ranges)",
    {
      userId: z.string().optional(),
      channelId: z.string().optional(),
      query: z.string(),
      limit: z.number().min(1).max(1000).default(100).optional(),
      maxScan: z.number().min(1).max(5000).default(500).optional().describe("Hard cap on messages walked"),
    },
    async ({ userId, channelId, query, limit, maxScan }) => {
      try {
        if (!userId && !channelId) throw new Error("Provide userId or channelId");
        const client = await getClient();
        let dm: any;
        if (channelId) {
          dm = await client.channels.fetch(channelId);
        } else {
          const user = await client.users.fetch(userId!);
          dm = await user.createDM();
        }
        if (!dm?.messages?.fetch) throw new Error("Channel is not fetchable");

        const lowerQuery = query.toLowerCase();
        const matches: any[] = [];
        let before: string | undefined = undefined;
        let scanned = 0;
        const cap = Math.min(maxScan ?? 500, 5000);
        const max = Math.min(limit ?? 100, 1000);

        while (scanned < cap && matches.length < max) {
          const batch = await dm.messages.fetch({ limit: 100, before });
          if (!batch || batch.size === 0) break;
          for (const m of batch.values() as any) {
            scanned++;
            if ((m.content ?? "").toLowerCase().includes(lowerQuery)) {
              matches.push({
                id: m.id,
                authorId: m.author.id,
                author: m.author.username,
                content: m.content,
                timestamp: m.createdAt.toISOString(),
              });
              if (matches.length >= max) break;
            }
          }
          const arr = Array.from(batch.values()) as any[];
          before = arr[arr.length - 1].id;
          if (batch.size < 100) break;
        }

        return toolResult({ scanned, matches });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_search_all_messages",
    "Search every guild you belong to via Discord's server search API and merge results",
    {
      query: z.string(),
      authorId: z.string().optional(),
      has: z.enum(["link", "embed", "file", "video", "image", "sound", "sticker"]).optional(),
      limitPerGuild: z.number().min(1).max(25).default(10).optional(),
      guildIds: z.array(z.string()).optional().describe("Restrict to these guilds"),
    },
    async ({ query, authorId, has, limitPerGuild, guildIds }) => {
      try {
        const client = await getClient();
        const guilds = Array.from(client.guilds.cache.values()).filter((g: any) =>
          guildIds ? guildIds.includes(g.id) : true
        );

        const perGuildLimit = limitPerGuild ?? 10;
        const results: any[] = [];
        const errors: any[] = [];

        for (const guild of guilds) {
          try {
            const result = await (guild as any).search({
              content: query,
              limit: perGuildLimit,
              ...(authorId && { authors: [authorId] }),
              ...(has && { has: [has] }),
            });
            const messages = result.messages?.flat?.() ?? result ?? [];
            if (Array.isArray(messages)) {
              for (const m of messages) {
                results.push({
                  guildId: (guild as any).id,
                  guildName: (guild as any).name,
                  channelId: m.channel_id ?? m.channelId,
                  messageId: m.id,
                  authorId: m.author?.id,
                  author: m.author?.username,
                  content: m.content,
                  timestamp: m.timestamp ?? m.createdTimestamp,
                });
              }
            }
          } catch (err: any) {
            errors.push({ guildId: (guild as any).id, error: err?.message ?? String(err) });
          }
        }

        return toolResult({
          query,
          guildsSearched: guilds.length,
          totalResults: results.length,
          results,
          errors,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_index_stats",
    "Report counts of messages/channels/attachments in the local SQLite index",
    {},
    async () => {
      try {
        return toolResult(stats());
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
