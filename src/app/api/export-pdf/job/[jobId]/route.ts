/**
 * GET /api/export-pdf/job/[jobId]
 * 
 * Polls the status of an export job by job ID.
 * Returns the current status, and fileUrl when complete.
 * 
 * Now uses Vercel KV for persistent job storage across serverless functions.
 */

import { NextRequest, NextResponse } from "next/server";
import { exportJobStore } from "@/lib/export-job-store.kv";
import type { GetExportJobResponse } from "@/types/export-job";

// =============================================================================
// Runtime Configuration
// =============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// GET Handler - Poll Job Status
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    // Look up job in store (now async with KV)
    const job = await exportJobStore.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { 
          error: "Job not found",
          jobId,
          message: "The job may have expired or never existed.",
        },
        { status: 404 }
      );
    }

    // Build response
    const response: GetExportJobResponse = {
      jobId: job.jobId,
      status: job.status,
    };

    // Include fileUrl if job is complete
    if (job.status === "done" && job.fileUrl) {
      response.fileUrl = job.fileUrl;
    }

    // Include error message if job failed
    if (job.status === "error" && job.error) {
      response.error = job.error;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("[ExportJob] Failed to get job status:", error);
    return NextResponse.json(
      { 
        error: "Failed to get job status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
