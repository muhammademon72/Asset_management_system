import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Reuse a single Prisma client across hot reloads (Next.js dev)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

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
    const row = await prisma.appData.findUnique({ where: { id: "main" } });
    if (row && row.data) {
      const parsed = JSON.parse(row.data);
      return NextResponse.json({ ok: true, data: parsed, updatedAt: row.updatedAt });
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
    const json = JSON.stringify(body.data);
    const row = await prisma.appData.upsert({
      where: { id: "main" },
      update: { data: json },
      create: { id: "main", data: json },
    });
    return NextResponse.json({ ok: true, updatedAt: row.updatedAt });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to save DB" },
      { status: 500 }
    );
  }
}
