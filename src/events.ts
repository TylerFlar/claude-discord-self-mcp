import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "./client.js";
import { formatMessage, toolResult, toolError } from "./helpers.js";

const RING_SIZE = 200;

type RingBuffer = { uri: string; events: any[] };

const buffers = new Map<string, RingBuffer>();

function ensureBuffer(uri: string): RingBuffer {
  let buf = buffers.get(uri);
  if (!buf) {
    buf = { uri, events: [] };
    buffers.set(uri, buf);
  }
  return buf;
}

async function push(server: McpServer, uri: string, event: any) {
  const buf = ensureBuffer(uri);
  buf.events.push({ ...event, receivedAt: Date.now() });
  if (buf.events.length > RING_SIZE) buf.events.splice(0, buf.events.length - RING_SIZE);
  try {
    await (server as any).server.sendResourceUpdated({ uri });
  } catch {
    // no subscribers yet — non-fatal
  }
}

function readBuffer(uri: string) {
  const buf = buffers.get(uri);
  return {
    uri,
    events: buf ? buf.events.slice().reverse() : [],
  };
}

export async function startEventBus(server: McpServer) {
  const staticResources: Array<{ name: string; uri: string; description: string }> = [
    { name: "events-dms", uri: "discord://events/dms", description: "Real-time ring buffer of new DM messages (last 200)" },
    { name: "events-mentions", uri: "discord://events/mentions", description: "Messages mentioning you (last 200)" },
    { name: "events-all", uri: "discord://events/all", description: "All new messages the client sees (last 200)" },
    { name: "events-reactions", uri: "discord://events/reactions", description: "Reaction-add events (last 200)" },
    { name: "events-guild-joins", uri: "discord://events/member-joins", description: "Member-join events across your guilds (last 200)" },
  ];

  for (const res of staticResources) {
    server.resource(res.name, res.uri, { description: res.description, mimeType: "application/json" }, async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(readBuffer(uri.href), null, 2),
        },
      ],
    }));
  }

  // Guild-scoped messages: one dynamic resource name per guild, registered lazily as events fire.
  const registeredGuildUris = new Set<string>();
  function ensureGuildResource(guildId: string) {
    const uri = `discord://events/guild/${guildId}`;
    if (registeredGuildUris.has(uri)) return uri;
    registeredGuildUris.add(uri);
    server.resource(
      `events-guild-${guildId}`,
      uri,
      { description: `Messages in guild ${guildId} (last 200)`, mimeType: "application/json" },
      async (u) => ({
        contents: [
          {
            uri: u.href,
            mimeType: "application/json",
            text: JSON.stringify(readBuffer(u.href), null, 2),
          },
        ],
      })
    );
    try {
      (server as any).server.sendResourceListChanged?.();
    } catch {}
    return uri;
  }

  const client = await getClient();
  const meId = (client as any).user?.id;

  (client as any).on("messageCreate", async (msg: any) => {
    const formatted = formatMessage(msg);
    const base = {
      type: "messageCreate",
      channelId: msg.channel?.id,
      guildId: msg.guild?.id ?? null,
      message: formatted,
    };
    await push(server, "discord://events/all", base);
    if (!msg.guild) await push(server, "discord://events/dms", base);
    if (msg.guild) {
      const uri = ensureGuildResource(msg.guild.id);
      await push(server, uri, base);
    }
    if (meId && msg.mentions?.users?.has?.(meId)) {
      await push(server, "discord://events/mentions", base);
    }
  });

  (client as any).on("messageReactionAdd", async (reaction: any, user: any) => {
    await push(server, "discord://events/reactions", {
      type: "reactionAdd",
      messageId: reaction.message?.id,
      channelId: reaction.message?.channel?.id,
      emoji: reaction.emoji?.name ?? reaction.emoji?.id,
      userId: user?.id,
      username: user?.username,
    });
  });

  (client as any).on("guildMemberAdd", async (member: any) => {
    await push(server, "discord://events/member-joins", {
      type: "guildMemberAdd",
      guildId: member.guild?.id,
      userId: member.user?.id,
      username: member.user?.username,
      joinedAt: member.joinedAt?.toISOString?.(),
    });
  });
}

export function registerEventTools(server: McpServer) {
  server.tool(
    "discord_get_events",
    "Read the in-memory ring buffer for an event URI (alternative to MCP resource subscription). URIs: discord://events/{dms,mentions,all,reactions,member-joins,guild/<id>}",
    {
      uri: z.string().describe("Event URI"),
      limit: z.number().min(1).max(200).default(50).optional(),
    },
    async ({ uri, limit }) => {
      try {
        const buf = readBuffer(uri);
        return toolResult({ uri, events: buf.events.slice(0, limit ?? 50) });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_event_streams",
    "List the active event stream URIs and their current buffer sizes",
    {},
    async () => {
      try {
        const list = Array.from(buffers.entries()).map(([uri, buf]) => ({
          uri,
          events: buf.events.length,
        }));
        return toolResult(list);
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
