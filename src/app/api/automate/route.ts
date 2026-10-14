import { NextRequest, NextResponse } from "next/server";
import { executeAutomation } from "@/lib/engine";
import { AutomationConfig, AutomationResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body: AutomationConfig = await req.json();
    const result = await executeAutomation(body);
    return NextResponse.json<AutomationResponse>(result);
  } catch (err: any) {
    return NextResponse.json<AutomationResponse>(
      {
        success: false,
        logs: [
          {
            step: 99,
            title: "Unexpected Automation Error",
            method: "INTERNAL",
            endpoint: "/api/automate",
            url: "/api/automate",
            status: "error",
            summary: `Internal server error: ${err.message}`,
            timestamp: new Date().toISOString(),
            error: err.message,
          },
        ],
        error: err.message,
      },
      { status: 500 }
    );
  }
}
