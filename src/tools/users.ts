import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatUser, formatMember } from "../helpers.js";

export function registerUserTools(server: McpServer) {
  server.tool(
    "discord_user_info",
    "Get information about a Discord user by ID",
    { userId: z.string() },
    async ({ userId }) => {
      try {
        const client = await getClient();
        const user = await client.users.fetch(userId, { force: true });
        return toolResult(formatUser(user));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_my_profile",
    "Get the authenticated user's profile information",
    {},
    async () => {
      try {
        const client = await getClient();
        const user = client.user;
        if (!user) throw new Error("Not logged in");
        return toolResult({
          ...formatUser(user),
          email: (user as any).email ?? null,
          verified: (user as any).verified ?? null,
          mfaEnabled: (user as any).mfaEnabled ?? null,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_friends",
    "List all friends/relationships",
    {},
    async () => {
      try {
        const client = await getClient();
        const relationships = client.relationships.cache
          .filter((r: any) => r.type === 1) // 1 = friend
          .map((r: any) => ({
            id: r.id,
            user: r.user ? formatUser(r.user) : { id: r.id },
            type: "friend",
          }));
        return toolResult(relationships);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_list_blocked",
    "List all blocked users",
    {},
    async () => {
      try {
        const client = await getClient();
        const blocked = client.relationships.cache
          .filter((r: any) => r.type === 2) // 2 = blocked
          .map((r: any) => ({
            id: r.id,
            user: r.user ? formatUser(r.user) : { id: r.id },
            type: "blocked",
          }));
        return toolResult(blocked);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_send_friend_request",
    "Send a friend request to a user",
    { userId: z.string() },
    async ({ userId }) => {
      try {
        const client = await getClient();
        const user = await client.users.fetch(userId);
        await (client as any).relationships.sendFriendRequest(user.username, user.discriminator);
        return toolResult({ sent: true, userId, username: user.username });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_remove_friend",
    "Remove a friend or cancel a friend request",
    { userId: z.string() },
    async ({ userId }) => {
      try {
        const client = await getClient();
        await (client as any).relationships.deleteRelationship(userId);
        return toolResult({ removed: true, userId });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_guild_member_info",
    "Get a user's guild-specific profile (nickname, roles, join date)",
    { guildId: z.string(), userId: z.string() },
    async ({ guildId, userId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        return toolResult(formatMember(member));
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
