import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { startJobWorker, resumeRunningJobs } from "@/lib/worker";
import { extractLinkedInSlug, sanitizeBaseUrl } from "@/lib/unipile";

export const dynamic = "force-dynamic";

let hasResumed = false;
function ensureJobsResumed() {
  if (hasResumed || process.env.NEXT_PHASE === "phase-production-build") return;
  hasResumed = true;
  resumeRunningJobs().catch(() => {});
}

export async function POST(req: NextRequest) {
  ensureJobsResumed();
  try {
    const body = await req.json();
    const {
      baseUrl: rawBaseUrl,
      apiKey,
      accountId,
      slugs: rawSlugs,
      minDelayMinutes = 2.0,
      maxDelayMinutes = 5.0,
      reactionType = "like",
      commentText = "",
      sendWithoutNote = false,
    } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const baseUrl = sanitizeBaseUrl(rawBaseUrl);

    const slugList: string[] = (Array.isArray(rawSlugs) ? rawSlugs : (rawSlugs || "").split(/[\n,]+/))
      .map((s: string) => extractLinkedInSlug(s))
      .filter(Boolean);

    if (slugList.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one valid LinkedIn slug or URL" },
        { status: 400 }
      );
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO jobs (
        id, status, account_id, base_url, api_key, min_delay_minutes, max_delay_minutes,
        reaction_type, comment_text, send_without_note, total_profiles, completed_profiles,
        current_index, created_at, updated_at
      ) VALUES (?, 'RUNNING', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [
        jobId,
        accountId,
        baseUrl,
        apiKey,
        minDelayMinutes,
        maxDelayMinutes,
        reactionType,
        commentText,
        sendWithoutNote ? 1 : 0,
        slugList.length,
        now,
        now,
      ]
    );

    for (let index = 0; index < slugList.length; index++) {
      const slug = slugList[index];
      const itemId = `${jobId}_item_${index}`;
      await db.execute(
        `INSERT INTO job_items (
          id, job_id, position, slug, status
        ) VALUES (?, ?, ?, ?, 'PENDING')`,
        [itemId, jobId, index, slug]
      );
    }

    // Start server-side worker
    startJobWorker(jobId);

    return NextResponse.json({
      success: true,
      jobId,
      totalProfiles: slugList.length,
      status: "RUNNING",
      message: "Batch job registered in database and running in background.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  ensureJobsResumed();
  try {
    const jobs = await db.query(`
      SELECT id, status, account_id, min_delay_minutes, max_delay_minutes, 
             total_profiles, completed_profiles, current_index, next_run_at, 
             current_gap_minutes, created_at, completed_at
      FROM jobs 
      ORDER BY created_at DESC 
      LIMIT 20
    `);

    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
