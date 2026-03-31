import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError } from "../helpers.js";

export function registerEmojiTools(server: McpServer) {
  server.tool(
    "discord_list_emojis",
    "List all custom emojis in a server",
    { guildId: z.string() },
    async ({ guildId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const emojis = await guild.emojis.fetch();
        return toolResult(
          emojis.map((e) => ({
            id: e.id,
            name: e.name,
            animated: e.animated,
            available: e.available,
            url: e.url,
            identifier: e.identifier,
          }))
        );
      } catch (err) {
        return toolError(err);
      }
    }
  );

  server.tool(
    "discord_list_stickers",
    "List all stickers in a server",
    { guildId: z.string() },
    async ({ guildId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const stickers = await guild.stickers.fetch();
        return toolResult(
          stickers.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            format: s.format,
            tags: s.tags,
            url: s.url,
          }))
        );
      } catch (err) {
        return toolError(err);
      }
    }
  );
}
