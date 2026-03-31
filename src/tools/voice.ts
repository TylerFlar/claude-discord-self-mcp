import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolResult, toolError } from "../helpers.js";

export function registerVoiceTools(server: McpServer) {
  server.tool(
    "discord_list_voice_members",
    "List members currently in a voice channel",
    { channelId: z.string() },
    async ({ channelId }) => {
      try {
        const client = await getClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !("members" in channel) || channel.type !== "GUILD_VOICE")
          throw new Error("Not a voice channel");
        const members = (channel as any).members.map((m: any) => ({
          userId: m.user.id,
          username: m.user.username,
          discriminator: m.user.discriminator,
          nickname: m.nickname,
          selfMute: m.voice.selfMute,
          selfDeaf: m.voice.selfDeaf,
          serverMute: m.voice.serverMute,
          serverDeaf: m.voice.serverDeaf,
          streaming: m.voice.streaming,
          camera: m.voice.selfVideo,
        }));
        return toolResult(members);
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
