import type { Message, Channel, Guild, GuildMember, Role, User, TextChannel, DMChannel, ThreadChannel } from "discord.js-selfbot-v13";

export function toolResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

export function formatMessage(msg: Message) {
  return {
    id: msg.id,
    author: {
      id: msg.author.id,
      username: msg.author.username,
      discriminator: msg.author.discriminator,
      bot: msg.author.bot,
    },
    content: msg.content,
    timestamp: msg.createdAt.toISOString(),
    editedAt: msg.editedAt?.toISOString() ?? null,
    attachments: msg.attachments.map((a) => ({
      id: a.id,
      filename: a.name,
      url: a.url,
      size: a.size,
      contentType: a.contentType,
    })),
    embeds: msg.embeds.map((e) => ({
      title: e.title,
      description: e.description,
      url: e.url,
      color: e.color,
      fields: e.fields,
    })),
    reactions: msg.reactions.cache.map((r) => ({
      emoji: r.emoji.name,
      count: r.count,
    })),
    referencedMessageId: msg.reference?.messageId ?? null,
    pinned: msg.pinned,
    type: msg.type,
  };
}

export function formatChannel(ch: Channel) {
  const base: Record<string, unknown> = {
    id: ch.id,
    type: ch.type,
  };
  if ("name" in ch && ch.name) base.name = ch.name;
  if ("topic" in ch) base.topic = (ch as TextChannel).topic;
  if ("parentId" in ch) base.parentId = (ch as TextChannel).parentId;
  if ("nsfw" in ch) base.nsfw = (ch as TextChannel).nsfw;
  if ("rateLimitPerUser" in ch) base.slowmode = (ch as TextChannel).rateLimitPerUser;
  if ("position" in ch) base.position = (ch as TextChannel).position;
  return base;
}

export function formatGuild(guild: Guild) {
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL(),
    ownerId: guild.ownerId,
    memberCount: guild.memberCount,
    description: guild.description,
    features: guild.features,
    createdAt: guild.createdAt.toISOString(),
  };
}

export function formatMember(member: GuildMember) {
  return {
    userId: member.user.id,
    username: member.user.username,
    discriminator: member.user.discriminator,
    nickname: member.nickname,
    roles: member.roles.cache.map((r) => ({ id: r.id, name: r.name })),
    joinedAt: member.joinedAt?.toISOString() ?? null,
    premiumSince: member.premiumSince?.toISOString() ?? null,
    avatar: member.avatarURL(),
  };
}

export function formatRole(role: Role) {
  return {
    id: role.id,
    name: role.name,
    color: role.hexColor,
    position: role.position,
    permissions: role.permissions.bitfield.toString(),
    mentionable: role.mentionable,
    hoist: role.hoist,
    managed: role.managed,
    memberCount: role.members.size,
  };
}

export function formatUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatarURL(),
    bot: user.bot,
    createdAt: user.createdAt.toISOString(),
    banner: user.bannerURL(),
  };
}
