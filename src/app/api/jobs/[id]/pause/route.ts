import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.execute("UPDATE jobs SET status = 'PAUSED', updated_at = ? WHERE id = ?", [
      new Date().toISOString(),
      id,
    ]);
    return NextResponse.json({ success: true, status: "PAUSED" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
