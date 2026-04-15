import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatMessage } from "../helpers.js";

export function registerDmTools(server: McpServer) {
  server.tool(
    "discord_open_dm",
    "Open or get an existing DM channel with a user",
    { userId: z.string() },
    async ({ userId }) => {
      try {
        const client = await getClient();
        const user = await client.users.fetch(userId);
        const dm = await user.createDM();
        return toolResult({
          channelId: dm.id,
          recipient: { id: user.id, username: user.username, discriminator: user.discriminator },
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_dms",
    "List DM channels (live from API, includes group DMs)",
    {
      limit: z.number().min(1).max(200).default(50).optional(),
      refresh: z.boolean().default(true).optional().describe("If true, fetch live from API instead of cache"),
    },
    async ({ limit, refresh }) => {
      try {
        const client = await getClient();
        let channels: any[];
        if (refresh ?? true) {
          const raw = await (client as any).api.users("@me").channels.get();
          channels = Array.isArray(raw) ? raw : [];
        } else {
          channels = client.channels.cache
            .filter((ch) => ch.type === "DM" || ch.type === "GROUP_DM")
            .map((ch) => {
              const dm = ch as any;
              return {
                id: dm.id,
                type: dm.type === "GROUP_DM" ? 3 : 1,
                recipients: dm.recipient
                  ? [{ id: dm.recipient.id, username: dm.recipient.username, discriminator: dm.recipient.discriminator }]
                  : dm.recipients
                  ? dm.recipients.map((r: any) => ({ id: r.id, username: r.username, discriminator: r.discriminator }))
                  : [],
                last_message_id: dm.lastMessageId,
                name: dm.name,
              };
            });
        }

        const formatted = channels
          .map((c: any) => ({
            channelId: c.id,
            type: c.type === 3 ? "GROUP_DM" : "DM",
            name: c.name ?? null,
            recipients: (c.recipients ?? []).map((r: any) => ({
              id: r.id,
              username: r.username,
              discriminator: r.discriminator,
              globalName: r.global_name,
            })),
            lastMessageId: c.last_message_id ?? null,
          }))
          .slice(0, limit ?? 50);

        return toolResult(formatted);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_read_dm_history",
    "Read message history from a DM with a user",
    {
      userId: z.string(),
      limit: z.number().min(1).max(100).default(25).optional(),
      before: z.string().optional(),
    },
    async ({ userId, limit, before }) => {
      try {
        const client = await getClient();
        const user = await client.users.fetch(userId);
        const dm = await user.createDM();
        const options: { limit?: number; before?: string } = { limit: limit ?? 25 };
        if (before) options.before = before;
        const messages = await dm.messages.fetch(options);
        return toolResult(messages.map(formatMessage));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_send_dm",
    "Send a direct message to a user",
    { userId: z.string(), content: z.string() },
    async ({ userId, content }) => {
      try {
        const client = await getClient();
        const user = await client.users.fetch(userId);
        const dm = await user.createDM();
        const msg = await dm.send(content);
        return toolResult(formatMessage(msg));
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
