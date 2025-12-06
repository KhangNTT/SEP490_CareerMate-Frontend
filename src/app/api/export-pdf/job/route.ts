/**
 * POST /api/export-pdf/job
 * 
 * Creates a new PDF export job and immediately returns the job ID.
 * The actual PDF generation runs in the background using setImmediate.
 * 
 * This replaces the old retry-based approach with a job-based polling system
 * that handles Puppeteer cold-start times gracefully.
 * 
 * Now uses Vercel KV for persistent job storage across serverless functions.
 */

import { NextRequest, NextResponse } from "next/server";
import { exportJobStore } from "@/lib/export-job-store.kv";
import { generatePDF } from "@/lib/pdf-export-worker";
import { uploadCVPDF } from "@/lib/firebase-upload";
import type { CreateExportJobRequest, CreateExportJobResponse } from "@/types/export-job";

// =============================================================================
// Runtime Configuration
// =============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes max for background processing

// =============================================================================
// POST Handler - Create Export Job
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: CreateExportJobRequest = await req.json();
    const { resumeId, templateId, cvData, fileName, userPackage, userId } = body;

    // Validate required fields
    if (!resumeId) {
      return NextResponse.json(
        { error: "resumeId is required" },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }

    if (!cvData) {
      return NextResponse.json(
        { error: "cvData is required" },
        { status: 400 }
      );
    }

    // Create job in store (now async with KV)
    const job = await exportJobStore.createJob(resumeId, templateId);
    const { jobId } = job;

    console.log(`[ExportJob] Created job ${jobId} for resume ${resumeId}`);

    // =======================================================================
    // Background Processing using setImmediate
    // This allows the response to return immediately while PDF generates
    // =======================================================================
    
    setImmediate(async () => {
      console.log(`[ExportJob] Starting background processing for job ${jobId}`);
      const startTime = Date.now();

      try {
        // Step 1: Generate PDF
        console.log(`[ExportJob] Generating PDF for job ${jobId}...`);
        const result = await generatePDF({
          templateId,
          cvData,
          fileName,
          userPackage,
        });

        if (!result.success) {
          console.error(`[ExportJob] PDF generation failed for job ${jobId}:`, result.error);
          await exportJobStore.failJob(jobId, result.error);
          return;
        }

        console.log(`[ExportJob] PDF generated for job ${jobId} (${result.sizeKB.toFixed(2)} KB)`);

        // Step 2: Upload to Firebase
        console.log(`[ExportJob] Uploading to Firebase for job ${jobId}...`);
        
        // Convert Buffer to Blob for uploadCVPDF
        const pdfBlob = new Blob([new Uint8Array(result.pdfBuffer)], { type: "application/pdf" });
        const cleanFileName = fileName || `cv-${resumeId}`;
        const uploadUserId = userId || "anonymous";

        const downloadURL = await uploadCVPDF(uploadUserId, pdfBlob, cleanFileName);

        console.log(`[ExportJob] Upload complete for job ${jobId}: ${downloadURL.substring(0, 60)}...`);

        // Step 3: Mark job as complete (now async with KV)
        await exportJobStore.completeJob(jobId, downloadURL);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[ExportJob] Job ${jobId} completed successfully in ${duration}s`);

      } catch (error: any) {
        console.error(`[ExportJob] Background processing failed for job ${jobId}:`, error);
        await exportJobStore.failJob(jobId, error.message || "Unknown error during export");
      }
    });

    // =======================================================================
    // Immediate Response
    // =======================================================================

    const response: CreateExportJobResponse = {
      jobId,
      status: "processing",
      message: "Export job created. Poll /api/export-pdf/job/{jobId} for status.",
    };

    return NextResponse.json(response, { status: 202 }); // 202 Accepted

  } catch (error: any) {
    console.error("[ExportJob] Failed to create export job:", error);
    return NextResponse.json(
      { 
        error: "Failed to create export job",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - Health Check
// =============================================================================

export async function GET() {
  // KV-based store doesn't support getAllJobs/getStoreStats
  // Return basic health check instead
  return NextResponse.json({
    service: "PDF Export Job API",
    status: "operational",
    storage: "Vercel KV",
    timestamp: new Date().toISOString(),
  });
}
