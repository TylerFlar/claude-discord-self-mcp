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
    "List recent DM channels",
    { limit: z.number().min(1).max(100).default(20).optional() },
    async ({ limit }) => {
      try {
        const client = await getClient();
        const dms = client.channels.cache
          .filter((ch) => ch.type === "DM")
          .map((ch) => {
            const dm = ch as any;
            return {
              channelId: dm.id,
              recipient: dm.recipient
                ? { id: dm.recipient.id, username: dm.recipient.username, discriminator: dm.recipient.discriminator }
                : null,
              lastMessageId: dm.lastMessageId,
            };
          })
          .slice(0, limit ?? 20);
        return toolResult(dms);
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
