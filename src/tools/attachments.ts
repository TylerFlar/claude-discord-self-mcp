import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatMessage } from "../helpers.js";
import { MessageEmbed } from "discord.js-selfbot-v13";

export function registerAttachmentTools(server: McpServer) {
  server.tool(
    "discord_send_attachment",
    "Send a file to a channel by URL",
    {
      channelId: z.string(),
      url: z.string().describe("URL of the file to attach"),
      filename: z.string().optional(),
      content: z.string().optional().describe("Accompanying text message"),
    },
    async ({ channelId, url, filename, content }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");
        const options: any = {
          files: [{ attachment: url, name: filename ?? undefined }],
        };
        if (content) options.content = content;
        const msg = await channel.send(options);
        return toolResult(formatMessage(msg));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_send_embed",
    "Send a rich embed message to a channel",
    {
      channelId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional().describe("Hex color (e.g., #ff0000)"),
      fields: z
        .array(z.object({ name: z.string(), value: z.string(), inline: z.boolean().optional() }))
        .optional(),
      imageUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      footerText: z.string().optional(),
      url: z.string().optional(),
    },
    async ({ channelId, title, description, color, fields, imageUrl, thumbnailUrl, footerText, url }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isText()) throw new Error("Channel is not a text channel");

        const embed = new MessageEmbed();
        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (color) embed.setColor(color as any);
        if (fields) fields.forEach((f) => embed.addField(f.name, f.value, f.inline));
        if (imageUrl) embed.setImage(imageUrl);
        if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
        if (footerText) embed.setFooter({ text: footerText });
        if (url) embed.setURL(url);

        const msg = await channel.send({ embeds: [embed] });
        return toolResult(formatMessage(msg));
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
