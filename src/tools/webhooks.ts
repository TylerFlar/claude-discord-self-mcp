import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError } from "../helpers.js";

export function registerWebhookTools(server: McpServer) {
  server.tool(
    "discord_list_webhooks",
    "List webhooks for a channel or entire guild",
    {
      channelId: z.string().optional(),
      guildId: z.string().optional(),
    },
    async ({ channelId, guildId }) => {
      try {
        const client = await getClient();
        let webhooks;
        if (channelId) {
          const channel = await client.channels.fetch(channelId);
          if (!channel || !("fetchWebhooks" in channel)) throw new Error("Channel does not support webhooks");
          webhooks = await (channel as any).fetchWebhooks();
        } else if (guildId) {
          const guild = await client.guilds.fetch(guildId);
          webhooks = await guild.fetchWebhooks();
        } else {
          throw new Error("Either channelId or guildId is required");
        }
        return toolResult(
          webhooks.map((wh: any) => ({
            id: wh.id,
            name: wh.name,
            channelId: wh.channelId,
            token: wh.token,
            url: wh.url,
            avatar: wh.avatarURL(),
            owner: wh.owner ? { id: wh.owner.id, username: wh.owner.username } : null,
          }))
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_create_webhook",
    "Create a webhook for a channel",
    {
      channelId: z.string(),
      name: z.string(),
      avatar: z.string().optional().describe("Avatar image URL"),
    },
    async ({ channelId, name, avatar }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !("createWebhook" in channel)) throw new Error("Channel does not support webhooks");
        const options: any = { name };
        if (avatar) options.avatar = avatar;
        const webhook = await (channel as any).createWebhook(options);
        return toolResult({
          id: webhook.id,
          name: webhook.name,
          token: webhook.token,
          url: webhook.url,
          channelId: webhook.channelId,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_send_webhook",
    "Send a message via a webhook",
    {
      webhookId: z.string(),
      webhookToken: z.string(),
      content: z.string().optional(),
      username: z.string().optional(),
      avatarUrl: z.string().optional(),
      embeds: z
        .array(
          z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            color: z.number().optional(),
            fields: z
              .array(z.object({ name: z.string(), value: z.string(), inline: z.boolean().optional() }))
              .optional(),
            url: z.string().optional(),
          })
        )
        .optional(),
    },
    async ({ webhookId, webhookToken, content, username, avatarUrl, embeds }) => {
      try {
        const client = await getClient();
        const webhook = await client.fetchWebhook(webhookId, webhookToken);
        const options: any = {};
        if (content) options.content = content;
        if (username) options.username = username;
        if (avatarUrl) options.avatarURL = avatarUrl;
        if (embeds) options.embeds = embeds;
        const msg = await webhook.send(options);
        return toolResult({ sent: true, messageId: msg.id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_delete_webhook",
    "Delete a webhook",
    { webhookId: z.string() },
    async ({ webhookId }) => {
      try {
        const client = await getClient();
        const webhook = await client.fetchWebhook(webhookId);
        const name = webhook.name;
        await webhook.delete();
        return toolResult({ deleted: true, webhookId, name });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
