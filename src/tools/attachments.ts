import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatMessage } from "../helpers.js";
import { MessageEmbed } from "discord.js-selfbot-v13";
import { getAttachment } from "../store.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const MESSAGE_URL_RE = /discord(?:app)?\.com\/channels\/(?:@me|\d+)\/(\d+)\/(\d+)/;

function parseMessageUrl(url: string): { channelId: string; messageId: string } | null {
  const m = url.match(MESSAGE_URL_RE);
  if (!m) return null;
  return { channelId: m[1], messageId: m[2] };
}

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

  server.tool(
    "discord_download_attachment",
    "Download a message attachment. Provide either a message URL, or channelId+messageId, or an attachmentId previously indexed.",
    {
      messageUrl: z.string().optional().describe("e.g. https://discord.com/channels/@me/123/456"),
      channelId: z.string().optional(),
      messageId: z.string().optional(),
      attachmentId: z.string().optional().describe("Specific attachment id (required when the message has >1 file)"),
      savePath: z.string().optional().describe("Absolute path to save the file. If omitted, returns base64."),
      returnBase64: z.boolean().default(false).optional(),
      maxBytes: z.number().min(1).max(50_000_000).default(25_000_000).optional(),
    },
    async ({ messageUrl, channelId, messageId, attachmentId, savePath, returnBase64, maxBytes }) => {
      try {
        const indexed = attachmentId ? getAttachment(attachmentId) : undefined;
        let url: string | undefined;
        let filename: string | undefined;
        let contentType: string | undefined;

        if (indexed) {
          url = indexed.url;
          filename = indexed.filename ?? undefined;
          contentType = indexed.content_type ?? undefined;
        } else {
          let chId = channelId;
          let mId = messageId;
          if (messageUrl) {
            const parsed = parseMessageUrl(messageUrl);
            if (!parsed) throw new Error("Unrecognized Discord message URL");
            chId = parsed.channelId;
            mId = parsed.messageId;
          }
          if (!chId || !mId) throw new Error("Provide messageUrl, channelId+messageId, or an indexed attachmentId");

          const client = await getClient();
          const channel: any = await client.channels.fetch(chId);
          if (!channel?.messages?.fetch) throw new Error("Channel does not support message fetch");
          const msg = await channel.messages.fetch(mId);
          const atts = Array.from(msg.attachments.values()) as any[];
          if (atts.length === 0) throw new Error("Message has no attachments");
          const att = attachmentId ? atts.find((a: any) => a.id === attachmentId) : atts[0];
          if (!att) throw new Error("Attachment not found on message");
          url = att.url;
          filename = att.name;
          contentType = att.contentType;
        }

        if (!url) throw new Error("Could not resolve attachment URL");

        const cap = maxBytes ?? 25_000_000;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status}`);
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.byteLength > cap) throw new Error(`Attachment exceeds maxBytes (${buf.byteLength} > ${cap})`);

        if (savePath) {
          const abs = resolve(savePath);
          mkdirSync(dirname(abs), { recursive: true });
          writeFileSync(abs, buf);
          return toolResult({
            saved: true,
            path: abs,
            filename: filename ?? null,
            contentType: contentType ?? null,
            bytes: buf.byteLength,
          });
        }

        return toolResult({
          filename: filename ?? null,
          contentType: contentType ?? null,
          bytes: buf.byteLength,
          base64: (returnBase64 ?? true) ? buf.toString("base64") : undefined,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
