import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    db.prepare("UPDATE jobs SET status = 'PAUSED', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      id
    );
    return NextResponse.json({ success: true, status: "PAUSED" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
