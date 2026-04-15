import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

let db: Database.Database | null = null;

function resolveDbPath(): string {
  if (process.env.DISCORD_MCP_DB) return process.env.DISCORD_MCP_DB;
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) return join(localAppData, "claude-discord-self-mcp", "index.db");
  const home = process.env.HOME || process.env.USERPROFILE || process.cwd();
  return join(home, ".claude-discord-self-mcp", "index.db");
}

export function getDb(): Database.Database {
  if (db) return db;
  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });
  db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  initSchema(db);
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function initSchema(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT,
      guild_id TEXT,
      recipient_id TEXT,
      last_indexed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      guild_id TEXT,
      author_id TEXT NOT NULL,
      author_username TEXT,
      content TEXT,
      created_at INTEGER NOT NULL,
      edited_at INTEGER,
      has_attachments INTEGER NOT NULL DEFAULT 0,
      is_dm INTEGER NOT NULL DEFAULT 0,
      reference_message_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_guild ON messages(guild_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_dm ON messages(is_dm, created_at DESC);

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      url TEXT NOT NULL,
      filename TEXT,
      size INTEGER,
      content_type TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      author_username,
      content_rowid UNINDEXED,
      tokenize = 'porter unicode61'
    );
  `);
}

export interface ChannelRow {
  id: string;
  type: string;
  name?: string | null;
  guild_id?: string | null;
  recipient_id?: string | null;
  last_indexed_at?: number | null;
}

export interface MessageRow {
  id: string;
  channel_id: string;
  guild_id?: string | null;
  author_id: string;
  author_username?: string | null;
  content?: string | null;
  created_at: number;
  edited_at?: number | null;
  has_attachments: number;
  is_dm: number;
  reference_message_id?: string | null;
}

export interface AttachmentRow {
  id: string;
  message_id: string;
  url: string;
  filename?: string | null;
  size?: number | null;
  content_type?: string | null;
}

export function upsertChannel(row: ChannelRow) {
  const d = getDb();
  d.prepare(
    `INSERT INTO channels (id, type, name, guild_id, recipient_id, last_indexed_at)
     VALUES (@id, @type, @name, @guild_id, @recipient_id, @last_indexed_at)
     ON CONFLICT(id) DO UPDATE SET
       type = excluded.type,
       name = excluded.name,
       guild_id = excluded.guild_id,
       recipient_id = excluded.recipient_id,
       last_indexed_at = COALESCE(excluded.last_indexed_at, channels.last_indexed_at)`
  ).run({
    id: row.id,
    type: row.type,
    name: row.name ?? null,
    guild_id: row.guild_id ?? null,
    recipient_id: row.recipient_id ?? null,
    last_indexed_at: row.last_indexed_at ?? null,
  });
}

export function setChannelIndexedAt(channelId: string, timestamp: number) {
  getDb()
    .prepare(`UPDATE channels SET last_indexed_at = ? WHERE id = ?`)
    .run(timestamp, channelId);
}

export function upsertMessages(rows: MessageRow[], attachments: AttachmentRow[] = []) {
  if (rows.length === 0 && attachments.length === 0) return;
  const d = getDb();
  const insertMsg = d.prepare(
    `INSERT INTO messages (id, channel_id, guild_id, author_id, author_username, content, created_at, edited_at, has_attachments, is_dm, reference_message_id)
     VALUES (@id, @channel_id, @guild_id, @author_id, @author_username, @content, @created_at, @edited_at, @has_attachments, @is_dm, @reference_message_id)
     ON CONFLICT(id) DO UPDATE SET
       content = excluded.content,
       edited_at = excluded.edited_at,
       has_attachments = excluded.has_attachments`
  );
  const deleteFts = d.prepare(`DELETE FROM messages_fts WHERE content_rowid = ?`);
  const insertFts = d.prepare(
    `INSERT INTO messages_fts (content, author_username, content_rowid) VALUES (?, ?, ?)`
  );
  const insertAtt = d.prepare(
    `INSERT INTO attachments (id, message_id, url, filename, size, content_type)
     VALUES (@id, @message_id, @url, @filename, @size, @content_type)
     ON CONFLICT(id) DO UPDATE SET
       url = excluded.url,
       filename = excluded.filename,
       size = excluded.size,
       content_type = excluded.content_type`
  );

  const tx = d.transaction(() => {
    for (const row of rows) {
      const info = insertMsg.run({
        id: row.id,
        channel_id: row.channel_id,
        guild_id: row.guild_id ?? null,
        author_id: row.author_id,
        author_username: row.author_username ?? null,
        content: row.content ?? null,
        created_at: row.created_at,
        edited_at: row.edited_at ?? null,
        has_attachments: row.has_attachments,
        is_dm: row.is_dm,
        reference_message_id: row.reference_message_id ?? null,
      });
      const rowId = Number(info.lastInsertRowid) || Number(
        (d.prepare(`SELECT rowid FROM messages WHERE id = ?`).get(row.id) as any)?.rowid ?? 0
      );
      if (rowId > 0) {
        deleteFts.run(rowId);
        insertFts.run(row.content ?? "", row.author_username ?? "", rowId);
      }
    }
    for (const att of attachments) insertAtt.run({
      id: att.id,
      message_id: att.message_id,
      url: att.url,
      filename: att.filename ?? null,
      size: att.size ?? null,
      content_type: att.content_type ?? null,
    });
  });
  tx();
}

export interface SearchFilters {
  scope?: "dms" | "guild" | "all";
  guildId?: string;
  channelId?: string;
  authorId?: string;
  hasAttachments?: boolean;
  since?: number;
  until?: number;
  limit?: number;
}

export function searchIndexed(query: string, filters: SearchFilters = {}) {
  const d = getDb();
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
  const clauses: string[] = [];
  const params: any[] = [];

  const usesFts = query.trim().length > 0;
  let sql: string;
  if (usesFts) {
    sql = `
      SELECT m.id, m.channel_id, m.guild_id, m.author_id, m.author_username, m.content,
             m.created_at, m.is_dm, m.has_attachments,
             snippet(messages_fts, 0, '[', ']', '...', 12) AS snippet,
             bm25(messages_fts) AS rank
      FROM messages_fts
      JOIN messages m ON m.rowid = messages_fts.content_rowid
      WHERE messages_fts MATCH ?
    `;
    params.push(query);
  } else {
    sql = `
      SELECT m.id, m.channel_id, m.guild_id, m.author_id, m.author_username, m.content,
             m.created_at, m.is_dm, m.has_attachments,
             NULL AS snippet,
             0 AS rank
      FROM messages m
      WHERE 1=1
    `;
  }

  if (filters.scope === "dms") clauses.push("m.is_dm = 1");
  else if (filters.scope === "guild") clauses.push("m.is_dm = 0");
  if (filters.guildId) {
    clauses.push("m.guild_id = ?");
    params.push(filters.guildId);
  }
  if (filters.channelId) {
    clauses.push("m.channel_id = ?");
    params.push(filters.channelId);
  }
  if (filters.authorId) {
    clauses.push("m.author_id = ?");
    params.push(filters.authorId);
  }
  if (filters.hasAttachments) clauses.push("m.has_attachments = 1");
  if (filters.since !== undefined) {
    clauses.push("m.created_at >= ?");
    params.push(filters.since);
  }
  if (filters.until !== undefined) {
    clauses.push("m.created_at <= ?");
    params.push(filters.until);
  }

  if (clauses.length) sql += " AND " + clauses.join(" AND ");
  sql += usesFts
    ? " ORDER BY rank LIMIT ?"
    : " ORDER BY m.created_at DESC LIMIT ?";
  params.push(limit);

  return d.prepare(sql).all(...params) as any[];
}

export function getChannel(id: string): ChannelRow | undefined {
  return getDb().prepare(`SELECT * FROM channels WHERE id = ?`).get(id) as any;
}

export function listChannels(filter: { is_dm?: boolean } = {}): ChannelRow[] {
  const d = getDb();
  if (filter.is_dm === true) {
    return d
      .prepare(`SELECT * FROM channels WHERE type IN ('DM','GROUP_DM') ORDER BY last_indexed_at DESC NULLS LAST`)
      .all() as any[];
  }
  return d.prepare(`SELECT * FROM channels`).all() as any[];
}

export function getAttachment(id: string): AttachmentRow | undefined {
  return getDb().prepare(`SELECT * FROM attachments WHERE id = ?`).get(id) as any;
}

export function stats() {
  const d = getDb();
  return {
    dbPath: resolveDbPath(),
    messages: (d.prepare(`SELECT COUNT(*) AS c FROM messages`).get() as any).c,
    dmMessages: (d.prepare(`SELECT COUNT(*) AS c FROM messages WHERE is_dm = 1`).get() as any).c,
    guildMessages: (d.prepare(`SELECT COUNT(*) AS c FROM messages WHERE is_dm = 0`).get() as any).c,
    channels: (d.prepare(`SELECT COUNT(*) AS c FROM channels`).get() as any).c,
    attachments: (d.prepare(`SELECT COUNT(*) AS c FROM attachments`).get() as any).c,
  };
}
