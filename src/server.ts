import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMessageTools } from "./tools/messages.js";
import { registerDmTools } from "./tools/dms.js";
import { registerGuildTools } from "./tools/guilds.js";
import { registerChannelTools } from "./tools/channels.js";
import { registerUserTools } from "./tools/users.js";
import { registerThreadTools } from "./tools/threads.js";
import { registerReactionTools } from "./tools/reactions.js";
import { registerRoleTools } from "./tools/roles.js";
import { registerModerationTools } from "./tools/moderation.js";
import { registerPresenceTools } from "./tools/presence.js";
import { registerInviteTools } from "./tools/invites.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerEmojiTools } from "./tools/emojis.js";
import { registerAttachmentTools } from "./tools/attachments.js";
import { registerVoiceTools } from "./tools/voice.js";
import { registerScanTools } from "./tools/scan.js";
import { registerForumTools } from "./tools/forums.js";
import { registerEventTools, startEventBus } from "./events.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "claude-discord-self-mcp",
    version: "0.2.0",
  });

  registerMessageTools(server);
  registerDmTools(server);
  registerGuildTools(server);
  registerChannelTools(server);
  registerUserTools(server);
  registerThreadTools(server);
  registerReactionTools(server);
  registerRoleTools(server);
  registerModerationTools(server);
  registerPresenceTools(server);
  registerInviteTools(server);
  registerWebhookTools(server);
  registerEmojiTools(server);
  registerAttachmentTools(server);
  registerVoiceTools(server);
  registerScanTools(server);
  registerForumTools(server);
  registerEventTools(server);

  startEventBus(server).catch((err) => {
    console.error("[discord-mcp] event bus failed to start:", err);
  });

  return server;
}
