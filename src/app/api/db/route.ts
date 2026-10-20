import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

// We use the libSQL/Turso client directly (without Prisma ORM) for maximum
// compatibility with Vercel serverless + Turso cloud database.
//
// The data model is simple: a single row in `app_data` table stores the
// entire application state as a JSON string. This is the same approach
// we used with Prisma, but without the Prisma adapter complexity.
//
// Required env vars:
//   DATABASE_URL       — e.g. libsql://my-db.turso.io  (or file:./db/custom.db for local)
//   DATABASE_AUTH_TOKEN — Turso auth token (empty string for local SQLite)

// Create a singleton libSQL client.
// Works on Vercel, local dev, and any serverless platform.
const globalForLibsql = globalThis as unknown as { libsqlClient?: ReturnType<typeof createClient> };

function getLibsqlClient() {
  if (globalForLibsql.libsqlClient) return globalForLibsql.libsqlClient;

  const url = process.env.DATABASE_URL || "file:./db/custom.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN || "";

  const client = createClient({
    url,
    authToken: authToken || undefined,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForLibsql.libsqlClient = client;
  }

  return client;
}

// Ensure the table exists (called on every request — cheap if it already exists)
async function ensureTable() {
  const client = getLibsqlClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_data (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

// Default empty DB shape (matches what app.html expects)
const DEFAULT_DB = {
  branches: [],
  employees: [],
  departments: [],
  designations: [],
  categories: [],
  brands: [],
  uoms: [],
  products: [],
  suppliers: [],
  conditions: [],
  warranties: [],
  purchases: [],
  deliveries: [],
  adjustments: [],
  damages: [],
  transfers: [],
  cashIn: [],
  cashOut: [],
  users: [
    {
      id: 1,
      name: "Admin User",
      username: "admin",
      email: "admin@itassets.com",
      password: "admin123",
      role: "Super Admin",
      status: "Active",
    },
  ],
  roles: [
    { id: 1, name: "Super Admin", permissions: "Full Access" },
    { id: 2, name: "Branch Manager", permissions: "Dashboard, Inventory, Reports (Own Branch)" },
    { id: 3, name: "Inventory Officer", permissions: "Inventory, Delivery, Adjustment" },
    { id: 4, name: "Finance Officer", permissions: "Cash Book, Reports" },
    { id: 5, name: "Viewer", permissions: "Dashboard, Reports (Read Only)" },
  ],
  company: { name: "", address: "", phone: "", email: "", website: "" },
};

// GET /api/db — return the latest saved DB object (or defaults if first run)
export async function GET() {
  try {
    await ensureTable();
    const client = getLibsqlClient();
    const result = await client.execute({
      sql: "SELECT data, updated_at FROM app_data WHERE id = ?",
      args: ["main"],
    });

    if (result.rows.length > 0 && result.rows[0].data) {
      const dataStr = result.rows[0].data as string;
      const parsed = JSON.parse(dataStr);
      const updatedAt = result.rows[0].updated_at as string;
      return NextResponse.json({ ok: true, data: parsed, updatedAt });
    }

    // First visit — return defaults so the client can boot
    return NextResponse.json({ ok: true, data: DEFAULT_DB, updatedAt: null });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to load DB" },
      { status: 500 }
    );
  }
}

// POST /api/db — replace the entire DB object with the body's `data`
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || !body.data) {
      return NextResponse.json(
        { ok: false, error: "Missing `data` in request body" },
        { status: 400 }
      );
    }

    await ensureTable();
    const client = getLibsqlClient();
    const json = JSON.stringify(body.data);

    // Upsert: try to update first, if no rows affected, insert
    const updateResult = await client.execute({
      sql: "UPDATE app_data SET data = ?, updated_at = datetime('now') WHERE id = ?",
      args: [json, "main"],
    });

    if (updateResult.rowsAffected === 0) {
      // No existing row — insert a new one
      await client.execute({
        sql: "INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))",
        args: ["main", json],
      });
    }

    // Read back the updated_at
    const readResult = await client.execute({
      sql: "SELECT updated_at FROM app_data WHERE id = ?",
      args: ["main"],
    });
    const updatedAt = readResult.rows.length > 0 ? readResult.rows[0].updated_at as string : new Date().toISOString();

    return NextResponse.json({ ok: true, updatedAt });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to save DB" },
      { status: 500 }
    );
  }
}
