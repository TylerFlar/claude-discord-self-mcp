import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError, formatRole } from "../helpers.js";

export function registerRoleTools(server: McpServer) {
  server.tool(
    "discord_list_roles",
    "List all roles in a Discord server",
    { guildId: z.string() },
    async ({ guildId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const roles = await guild.roles.fetch();
        return toolResult(roles.map(formatRole));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_role_info",
    "Get detailed information about a specific role",
    { guildId: z.string(), roleId: z.string() },
    async ({ guildId, roleId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const role = await guild.roles.fetch(roleId);
        if (!role) throw new Error("Role not found");
        return toolResult(formatRole(role));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_assign_role",
    "Add a role to a server member",
    { guildId: z.string(), userId: z.string(), roleId: z.string() },
    async ({ guildId, userId, roleId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.roles.add(roleId);
        return toolResult({ assigned: true, userId, roleId });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_remove_role",
    "Remove a role from a server member",
    { guildId: z.string(), userId: z.string(), roleId: z.string() },
    async ({ guildId, userId, roleId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.roles.remove(roleId);
        return toolResult({ removed: true, userId, roleId });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_create_role",
    "Create a new role in a server",
    {
      guildId: z.string(),
      name: z.string(),
      color: z.string().optional().describe("Hex color code (e.g., #ff0000)"),
      permissions: z.string().optional().describe("Permission bitfield"),
      mentionable: z.boolean().default(false).optional(),
      hoist: z.boolean().default(false).optional(),
    },
    async ({ guildId, name, color, permissions, mentionable, hoist }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const options: Record<string, unknown> = { name };
        if (color) options.color = color;
        if (permissions) options.permissions = BigInt(permissions);
        if (mentionable !== undefined) options.mentionable = mentionable;
        if (hoist !== undefined) options.hoist = hoist;
        const role = await guild.roles.create(options as any);
        return toolResult(formatRole(role));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "discord_delete_role",
    "Delete a role from a server",
    { guildId: z.string(), roleId: z.string() },
    async ({ guildId, roleId }) => {
      try {
        const client = await getClient();
        const guild = await client.guilds.fetch(guildId);
        const role = await guild.roles.fetch(roleId);
        if (!role) throw new Error("Role not found");
        const name = role.name;
        await role.delete();
        return toolResult({ deleted: true, roleId, name });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
