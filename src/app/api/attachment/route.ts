import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

// Allow up to 60 seconds for large file uploads.
export const maxDuration = 60;
export const runtime = "nodejs";

const globalForLibsql = globalThis as unknown as { libsqlClient?: ReturnType<typeof createClient> };

function getLibsqlClient() {
  if (globalForLibsql.libsqlClient) return globalForLibsql.libsqlClient;
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:./db/custom.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "";
  const client = createClient({ url, authToken: authToken || undefined });
  if (process.env.NODE_ENV !== "production") {
    globalForLibsql.libsqlClient = client;
  }
  return client;
}

async function ensureTable() {
  const client = getLibsqlClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      filetype TEXT NOT NULL DEFAULT 'File',
      filesize TEXT,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

// GET /api/attachment?id=xxx — download an attachment by ID
// GET /api/attachment — list all attachment IDs (metadata only, no data)
export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const client = getLibsqlClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      // Download a specific attachment
      const result = await client.execute({
        sql: "SELECT filename, filetype, filesize, data FROM attachments WHERE id = ?",
        args: [id],
      });
      if (result.rows.length === 0) {
        return NextResponse.json({ ok: false, error: "Attachment not found" }, { status: 404 });
      }
      const row = result.rows[0];
      return NextResponse.json({
        ok: true,
        attachment: {
          id,
          name: row.filename,
          type: row.filetype,
          size: row.filesize,
          data: row.data,
        },
      });
    } else {
      // List all attachment IDs (metadata only — no base64 data, to keep response small)
      const result = await client.execute("SELECT id, filename, filetype, filesize FROM attachments");
      const attachments = result.rows.map((r) => ({
        id: r.id,
        name: r.filename,
        type: r.filetype,
        size: r.filesize,
      }));
      return NextResponse.json({ ok: true, attachments });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load attachment" }, { status: 500 });
  }
}

// POST /api/attachment — upload a new attachment
// Body: { id: "xxx", name: "file.jpg", type: "image/jpeg", size: "123 KB", data: "base64..." }
export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const client = getLibsqlClient();
    const body = await req.json();
    if (!body || !body.id || !body.data) {
      return NextResponse.json({ ok: false, error: "Missing id or data" }, { status: 400 });
    }

    // Upsert: try UPDATE first, then INSERT
    const updateResult = await client.execute({
      sql: "UPDATE attachments SET filename = ?, filetype = ?, filesize = ?, data = ?, created_at = datetime('now') WHERE id = ?",
      args: [body.name || "file", body.type || "File", body.size || "", body.data, body.id],
    });

    if (updateResult.rowsAffected === 0) {
      await client.execute({
        sql: "INSERT INTO attachments (id, filename, filetype, filesize, data) VALUES (?, ?, ?, ?, ?)",
        args: [body.id, body.name || "file", body.type || "File", body.size || "", body.data],
      });
    }

    return NextResponse.json({ ok: true, id: body.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to save attachment" }, { status: 500 });
  }
}

// DELETE /api/attachment?id=xxx — delete an attachment by ID
export async function DELETE(req: NextRequest) {
  try {
    await ensureTable();
    const client = getLibsqlClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id parameter" }, { status: 400 });
    }
    await client.execute({ sql: "DELETE FROM attachments WHERE id = ?", args: [id] });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to delete attachment" }, { status: 500 });
  }
}
