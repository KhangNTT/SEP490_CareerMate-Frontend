/**
 * Export Job Store
 * 
 * In-memory job store for managing PDF export jobs.
 * Uses globalThis to persist data across serverless function invocations.
 * 
 * IMPORTANT: This uses globalThis pattern to work around Next.js serverless
 * limitations where each API request may run in a fresh instance.
 * For production at scale, consider using Redis or a database.
 * 
 * Jobs are automatically cleaned up after 10 minutes to prevent memory leaks.
 */

import { ExportJobState } from "@/types/export-job";

// =============================================================================
// Configuration
// =============================================================================

/** How long to keep completed/failed jobs before cleanup (10 minutes) */
const JOB_TTL_MS = 10 * 60 * 1000;

/** How often to run cleanup (every 2 minutes) */
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

// =============================================================================
// Global Store Setup (persists across serverless invocations)
// =============================================================================

// Extend globalThis type to include our store
declare global {
  // eslint-disable-next-line no-var
  var __exportJobStore: Map<string, ExportJobState> | undefined;
  // eslint-disable-next-line no-var
  var __exportJobStoreCleanupStarted: boolean | undefined;
}

/**
 * Get or create the global job store
 * This ensures the same Map instance is used across all API requests
 */
function getStore(): Map<string, ExportJobState> {
  if (!globalThis.__exportJobStore) {
    globalThis.__exportJobStore = new Map<string, ExportJobState>();
    console.log("[ExportJobStore] Initialized global job store");
  }
  return globalThis.__exportJobStore;
}

// =============================================================================
// UUID Generation
// =============================================================================

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// =============================================================================
// Store Operations
// =============================================================================

/**
 * Create a new export job
 */
export function createJob(resumeId: number, templateId: string): ExportJobState {
  const store = getStore();
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
  
  store.set(jobId, job);
  console.log(`[ExportJobStore] Created job ${jobId} for resume ${resumeId} (total jobs: ${store.size})`);
  
  return job;
}

/**
 * Get a job by ID
 */
export function getJob(jobId: string): ExportJobState | undefined {
  const store = getStore();
  const job = store.get(jobId);
  console.log(`[ExportJobStore] Getting job ${jobId}: ${job ? job.status : 'NOT FOUND'} (store size: ${store.size})`);
  return job;
}

/**
 * Update a job's status to "done" with the file URL
 */
export function completeJob(jobId: string, fileUrl: string): void {
  const store = getStore();
  const job = store.get(jobId);
  if (job) {
    job.status = "done";
    job.fileUrl = fileUrl;
    job.updatedAt = Date.now();
    store.set(jobId, job);
    console.log(`[ExportJobStore] Job ${jobId} completed with URL: ${fileUrl.substring(0, 50)}...`);
  } else {
    console.warn(`[ExportJobStore] Attempted to complete non-existent job: ${jobId}`);
  }
}

/**
 * Update a job's status to "error" with an error message
 */
export function failJob(jobId: string, error: string): void {
  const store = getStore();
  const job = store.get(jobId);
  if (job) {
    job.status = "error";
    job.error = error;
    job.updatedAt = Date.now();
    store.set(jobId, job);
    console.error(`[ExportJobStore] Job ${jobId} failed: ${error}`);
  } else {
    console.warn(`[ExportJobStore] Attempted to fail non-existent job: ${jobId}`);
  }
}

/**
 * Delete a job from the store
 */
export function deleteJob(jobId: string): void {
  const store = getStore();
  store.delete(jobId);
  console.log(`[ExportJobStore] Deleted job ${jobId}`);
}

/**
 * Get all jobs (for debugging)
 */
export function getAllJobs(): ExportJobState[] {
  const store = getStore();
  return Array.from(store.values());
}

/**
 * Get store statistics (for monitoring)
 */
export function getStoreStats(): {
  totalJobs: number;
  processing: number;
  done: number;
  error: number;
} {
  const store = getStore();
  const jobs = Array.from(store.values());
  return {
    totalJobs: jobs.length,
    processing: jobs.filter(j => j.status === "processing").length,
    done: jobs.filter(j => j.status === "done").length,
    error: jobs.filter(j => j.status === "error").length,
  };
}

// =============================================================================
// Cleanup Logic (runs once globally)
// =============================================================================

function cleanupOldJobs(): void {
  const store = getStore();
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [jobId, job] of store.entries()) {
    if (job.status === "processing") continue;
    
    if (now - job.updatedAt > JOB_TTL_MS) {
      store.delete(jobId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[ExportJobStore] Cleaned up ${cleanedCount} old jobs`);
  }
}

// Start cleanup interval ONLY ONCE using global flag
if (typeof setInterval !== "undefined" && !globalThis.__exportJobStoreCleanupStarted) {
  globalThis.__exportJobStoreCleanupStarted = true;
  setInterval(cleanupOldJobs, CLEANUP_INTERVAL_MS);
  console.log("[ExportJobStore] Started automatic cleanup interval (once)");
}

// =============================================================================
// Export
// =============================================================================

export const exportJobStore = {
  createJob,
  getJob,
  completeJob,
  failJob,
  deleteJob,
  getAllJobs,
  getStoreStats,
};

export default exportJobStore;
