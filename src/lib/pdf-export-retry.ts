/**
 * PDF Export Retry Mechanism
 * 
 * @deprecated This module is deprecated as of Dec 2025.
 * Use the new job-based polling approach instead:
 * - Hook: useExportPDFJob from "@/hooks/useExportPDFJob"
 * - API: POST /api/export-pdf/job (create job)
 * - API: GET /api/export-pdf/job/:jobId (poll status)
 * 
 * The retry-based approach caused failures in production because
 * Puppeteer cold-start and rendering time exceeded the retry timeout.
 * The new job-based approach handles long-running exports gracefully
 * with 90-second polling timeout.
 * 
 * KEPT FOR REFERENCE - DO NOT USE IN NEW CODE
 * 
 * Old features (now deprecated):
 * - Exponential backoff
 * - Client-side timeout
 * - Proper error classification
 */

// =============================================================================
// Types
// =============================================================================

export interface ExportPDFPayload {
  resumeId: number;
  templateId: string;
  userPackage?: string;
  [key: string]: unknown;
}

export interface ExportPDFError {
  type: "EXPORT_PDF_FAILED";
  attempts: number;
  lastError: Error | string;
  statusCode?: number;
}

interface RetryConfig {
  maxAttempts: number;
  backoffDelays: number[];
  timeoutMs: number;
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffDelays: [500, 1200, 2000], // Exponential backoff
  timeoutMs: 20000, // 20 seconds timeout
};

// HTTP status codes that should NOT be retried
const NON_RETRYABLE_STATUS_CODES = [400, 401, 403, 404, 422];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with client-side timeout using AbortController
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors, timeout errors
    if (error.name === "AbortError") return true; // Timeout
    if (error.name === "TypeError") return true; // Network failure
    if (error.message.includes("fetch")) return true;
    if (error.message.includes("network")) return true;
    if (error.message.includes("timeout")) return true;
  }
  return true; // Default to retryable for unknown errors
}

/**
 * Check if HTTP status code is retryable
 */
function isRetryableStatusCode(status: number): boolean {
  // Don't retry 4xx errors (except 408 Request Timeout, 429 Too Many Requests)
  if (NON_RETRYABLE_STATUS_CODES.includes(status)) {
    return false;
  }
  // Retry on 5xx server errors
  if (status >= 500 && status < 600) {
    return true;
  }
  // Retry on specific 4xx that indicate temporary issues
  if (status === 408 || status === 429) {
    return true;
  }
  return false;
}

/**
 * Create a standardized export error
 */
function createExportError(
  attempts: number,
  lastError: Error | string,
  statusCode?: number
): ExportPDFError {
  return {
    type: "EXPORT_PDF_FAILED",
    attempts,
    lastError,
    statusCode,
  };
}

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Download CV PDF with automatic retry mechanism
 * 
 * @param resumeId - The ID of the resume to export
 * @param payload - The export payload (templateId, userPackage, etc.)
 * @param config - Optional retry configuration
 * @returns Promise<Blob> - The PDF blob on success
 * @throws ExportPDFError - On failure after all retries
 * 
 * @example
 * ```ts
 * try {
 *   const pdfBlob = await downloadCVWithRetry(123, {
 *     resumeId: 123,
 *     templateId: "modern",
 *     userPackage: "BASIC"
 *   });
 *   // Trigger download
 *   const url = URL.createObjectURL(pdfBlob);
 *   const a = document.createElement("a");
 *   a.href = url;
 *   a.download = "my-cv.pdf";
 *   a.click();
 *   URL.revokeObjectURL(url);
 * } catch (error) {
 *   if (error.type === "EXPORT_PDF_FAILED") {
 *     console.error(`Failed after ${error.attempts} attempts:`, error.lastError);
 *   }
 * }
 * ```
 */
export async function downloadCVWithRetry(
  resumeId: number,
  payload: ExportPDFPayload,
  config: Partial<RetryConfig> = {}
): Promise<Blob> {
  const { maxAttempts, backoffDelays, timeoutMs } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | string = "Unknown error";
  let lastStatusCode: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[PDF Export] Attempt ${attempt}/${maxAttempts} for resume ${resumeId}`);

      const response = await fetchWithTimeout(
        "/api/export-pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payload,
            resumeId,
          }),
        },
        timeoutMs
      );

      lastStatusCode = response.status;

      // Check if response is successful
      if (response.ok) {
        const blob = await response.blob();
        
        // Validate blob
        if (blob.size === 0) {
          throw new Error("Received empty PDF file");
        }
        
        // Validate content type
        const contentType = response.headers.get("content-type");
        if (contentType && !contentType.includes("application/pdf")) {
          // Try to read error message from response
          const text = await blob.text();
          throw new Error(`Invalid response type: ${contentType}. Response: ${text.substring(0, 200)}`);
        }

        console.log(`[PDF Export] Success on attempt ${attempt}, blob size: ${blob.size} bytes`);
        return blob;
      }

      // Handle non-OK response
      lastError = `HTTP ${response.status}: ${response.statusText}`;

      // Check if error is retryable
      if (!isRetryableStatusCode(response.status)) {
        // Try to get more details from response
        try {
          const errorBody = await response.text();
          if (errorBody) {
            lastError = `HTTP ${response.status}: ${errorBody.substring(0, 200)}`;
          }
        } catch {
          // Ignore parse error
        }
        
        console.error(`[PDF Export] Non-retryable error (${response.status}), aborting`);
        throw createExportError(attempt, lastError, lastStatusCode);
      }

      console.warn(`[PDF Export] Retryable error on attempt ${attempt}: ${lastError}`);

    } catch (error) {
      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        lastError = `Request timeout after ${timeoutMs}ms`;
        console.warn(`[PDF Export] Timeout on attempt ${attempt}`);
      } 
      // Handle ExportPDFError (non-retryable, re-throw)
      else if (typeof error === "object" && error !== null && "type" in error) {
        throw error;
      }
      // Handle other errors
      else if (error instanceof Error) {
        lastError = error.message;
        
        // Check if this error type should be retried
        if (!isRetryableError(error)) {
          console.error(`[PDF Export] Non-retryable error, aborting:`, error);
          throw createExportError(attempt, lastError, lastStatusCode);
        }
        
        console.warn(`[PDF Export] Error on attempt ${attempt}:`, error.message);
      } else {
        lastError = String(error);
        console.warn(`[PDF Export] Unknown error on attempt ${attempt}:`, error);
      }
    }

    // Wait before retry (except on last attempt)
    if (attempt < maxAttempts) {
      const delay = backoffDelays[attempt - 1] || backoffDelays[backoffDelays.length - 1];
      console.log(`[PDF Export] Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }

  // All retries exhausted
  console.error(`[PDF Export] All ${maxAttempts} attempts failed`);
  throw createExportError(maxAttempts, lastError, lastStatusCode);
}

// =============================================================================
// Utility: Trigger Browser Download
// =============================================================================

/**
 * Trigger browser download from a Blob
 * 
 * @param blob - The PDF blob
 * @param filename - The filename for download
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Combined Helper: Download with Retry and Save
// =============================================================================

/**
 * Complete flow: Export PDF with retry and trigger download
 * 
 * @param resumeId - The ID of the resume
 * @param payload - Export payload
 * @param filename - Filename for the downloaded file
 * @returns Promise<void>
 * @throws ExportPDFError on failure
 */
export async function exportAndDownloadCV(
  resumeId: number,
  payload: ExportPDFPayload,
  filename: string = "cv.pdf"
): Promise<void> {
  const blob = await downloadCVWithRetry(resumeId, payload);
  triggerBlobDownload(blob, filename);
}
