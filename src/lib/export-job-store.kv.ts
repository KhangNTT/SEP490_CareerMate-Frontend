/**
 * Export Job Store - Vercel KV Implementation
 * 
 * Persistent job store for managing PDF export jobs using Vercel KV.
 * This replaces the in-memory Map/globalThis approach to work properly
 * on Vercel's serverless infrastructure where functions don't share memory.
 * 
 * Features:
 * - ✅ Works across multiple serverless function instances
 * - ✅ Automatic job expiration after 10 minutes (TTL)
 * - ✅ No cleanup intervals needed (KV handles it)
 * - ✅ Production-ready for Vercel deployment
 * 
 * Environment Variables (automatically injected by Vercel):
 * - KV_REST_API_URL
 * - KV_REST_API_TOKEN
 * - KV_REST_API_READ_ONLY_TOKEN
 */

import { kv } from "@vercel/kv";
import { ExportJobState } from "@/types/export-job";

// =============================================================================
// Configuration
// =============================================================================

/** How long to keep jobs in KV before automatic expiration (10 minutes) */
const JOB_TTL_SECONDS = 10 * 60;

/** KV key prefix for export jobs */
const KEY_PREFIX = "export-pdf-job:";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a KV key for a job ID
 */
function getJobKey(jobId: string): string {
  return `${KEY_PREFIX}${jobId}`;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// Store Operations
// =============================================================================

/**
 * Create a new export job in KV
 * 
 * @param resumeId - The resume ID being exported
 * @param templateId - The template ID used for export
 * @returns The created job state with a unique job ID
 */
export async function createJob(
  resumeId: number,
  templateId: string
): Promise<ExportJobState> {
  const jobId = generateUUID();
  const now = Date.now();

  const job: ExportJobState = {
    jobId,
    status: "processing",
    resumeId,
    templateId,
    createdAt: now,
    updatedAt: now,
  };

  // Store in KV with automatic expiration
  await kv.set(getJobKey(jobId), job, { ex: JOB_TTL_SECONDS });

  console.log(`[ExportJobStore:KV] Created job ${jobId} for resume ${resumeId}`);

  return job;
}

/**
 * Get a job by ID from KV
 * 
 * @param jobId - The job ID to retrieve
 * @returns The job state or null if not found
 */
export async function getJob(jobId: string): Promise<ExportJobState | null> {
  const job = await kv.get<ExportJobState>(getJobKey(jobId));

  if (job) {
    console.log(`[ExportJobStore:KV] Retrieved job ${jobId}: ${job.status}`);
  } else {
    console.log(`[ExportJobStore:KV] Job ${jobId} not found (may have expired)`);
  }

  return job;
}

/**
 * Update a job in KV
 * 
 * @param jobId - The job ID to update
 * @param updates - Partial updates to apply to the job
 */
export async function updateJob(
  jobId: string,
  updates: Partial<Omit<ExportJobState, "jobId" | "createdAt">>
): Promise<void> {
  const existing = await getJob(jobId);

  if (!existing) {
    console.warn(`[ExportJobStore:KV] Cannot update non-existent job: ${jobId}`);
    return;
  }

  const updated: ExportJobState = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  // Update in KV with TTL refresh
  await kv.set(getJobKey(jobId), updated, { ex: JOB_TTL_SECONDS });

  console.log(`[ExportJobStore:KV] Updated job ${jobId}:`, {
    status: updated.status,
    hasFileUrl: !!updated.fileUrl,
    hasError: !!updated.error,
  });
}

/**
 * Mark a job as complete with a file URL
 * 
 * @param jobId - The job ID to complete
 * @param fileUrl - The Firebase download URL for the generated PDF
 */
export async function completeJob(jobId: string, fileUrl: string): Promise<void> {
  await updateJob(jobId, {
    status: "done",
    fileUrl,
  });

  console.log(`[ExportJobStore:KV] Job ${jobId} completed with URL: ${fileUrl.substring(0, 50)}...`);
}

/**
 * Mark a job as failed with an error message
 * 
 * @param jobId - The job ID to fail
 * @param error - The error message
 */
export async function failJob(jobId: string, error: string): Promise<void> {
  await updateJob(jobId, {
    status: "error",
    error,
  });

  console.error(`[ExportJobStore:KV] Job ${jobId} failed: ${error}`);
}

/**
 * Delete a job from KV
 * 
 * @param jobId - The job ID to delete
 */
export async function deleteJob(jobId: string): Promise<void> {
  await kv.del(getJobKey(jobId));
  console.log(`[ExportJobStore:KV] Deleted job ${jobId}`);
}

// =============================================================================
// Export Default Object (for backward compatibility)
// =============================================================================

export const exportJobStore = {
  createJob,
  getJob,
  updateJob,
  completeJob,
  failJob,
  deleteJob,
};

export default exportJobStore;
