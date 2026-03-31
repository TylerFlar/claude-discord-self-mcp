import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError } from "../helpers.js";

export function registerInviteTools(server: McpServer) {
  server.tool(
    "discord_create_invite",
    "Create an invite link for a channel",
    {
      channelId: z.string(),
      maxAge: z.number().min(0).default(86400).optional().describe("Invite duration in seconds (0 = permanent)"),
      maxUses: z.number().min(0).default(0).optional().describe("Max uses (0 = unlimited)"),
      temporary: z.boolean().default(false).optional(),
    },
    async ({ channelId, maxAge, maxUses, temporary }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !("createInvite" in channel)) throw new Error("Channel does not support invites");
        const invite = await (channel as any).createInvite({
          maxAge: maxAge ?? 86400,
          maxUses: maxUses ?? 0,
          temporary: temporary ?? false,
        });
        return toolResult({
          code: invite.code,
          url: invite.url,
          maxAge: invite.maxAge,
          maxUses: invite.maxUses,
          temporary: invite.temporary,
          expiresAt: invite.expiresAt?.toISOString() ?? null,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_invites",
    "List all invites for a server",
    { guildId: z.string() },
    async ({ guildId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const invites = await guild.invites.fetch();
        return toolResult(
          invites.map((inv) => ({
            code: inv.code,
            url: inv.url,
            channelId: inv.channelId,
            inviter: inv.inviter ? { id: inv.inviter.id, username: inv.inviter.username } : null,
            uses: inv.uses,
            maxUses: inv.maxUses,
            maxAge: inv.maxAge,
            temporary: inv.temporary,
            createdAt: inv.createdAt?.toISOString(),
            expiresAt: inv.expiresAt?.toISOString() ?? null,
          }))
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_delete_invite",
    "Delete/revoke an invite by code",
    { code: z.string() },
    async ({ code }) => {
      try {
        const client = await getClient();
        const invite = await client.fetchInvite(code);
        await invite.delete();
        return toolResult({ deleted: true, code });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_accept_invite",
    "Join a server via invite code",
    { code: z.string() },
    async ({ code }) => {
      try {
        const client = await getClient();
        const invite = await (client as any).acceptInvite(code);
        return toolResult({
          joined: true,
          code,
          guild: invite?.guild ? { id: invite.guild.id, name: invite.guild.name } : null,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
