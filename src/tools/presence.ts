import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError } from "../helpers.js";

export function registerPresenceTools(server: McpServer) {
  server.tool(
    "discord_set_status",
    "Set your online status (online, idle, dnd, invisible)",
    { status: z.enum(["online", "idle", "dnd", "invisible"]) },
    async ({ status }) => {
      try {
        const client = await getClient();
        client.user?.setStatus(status);
        return toolResult({ status });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_set_custom_status",
    "Set a custom status text and/or emoji",
    {
      text: z.string().optional(),
      emoji: z.string().optional(),
      expiresAt: z.string().optional().describe("ISO timestamp when the status expires"),
    },
    async ({ text, emoji, expiresAt }) => {
      try {
        const client = await getClient();
        const activity: any = {
          type: "CUSTOM",
          name: "Custom Status",
          state: text,
        };
        if (emoji) activity.emoji = { name: emoji };
        if (expiresAt) activity.timestamps = { end: new Date(expiresAt).getTime() };
        client.user?.setActivity(activity);
        return toolResult({ text, emoji, expiresAt });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_set_activity",
    "Set a playing/streaming/listening/watching/competing activity",
    {
      type: z.enum(["PLAYING", "STREAMING", "LISTENING", "WATCHING", "COMPETING"]),
      name: z.string(),
      url: z.string().optional().describe("URL for streaming type"),
    },
    async ({ type, name, url }) => {
      try {
        const client = await getClient();
        const options: any = { type, name };
        if (url) options.url = url;
        client.user?.setActivity(options);
        return toolResult({ type, name, url });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_clear_activity",
    "Clear all activities and custom status",
    {},
    async () => {
      try {
        const client = await getClient();
        client.user?.setPresence({ activities: [] });
        return toolResult({ cleared: true });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
