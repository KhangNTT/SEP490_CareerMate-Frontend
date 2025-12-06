/**
 * Export Job Types
 * 
 * Type definitions for the PDF export job-based polling architecture.
 * This replaces the retry-based approach with a more robust job queue system.
 */

// =============================================================================
// Job State Types
// =============================================================================

/**
 * Possible states of an export job
 */
export type ExportJobStatus = "processing" | "done" | "error";

/**
 * Export job state stored in the job store
 */
export interface ExportJobState {
  /** Unique job identifier (UUID) */
  jobId: string;
  
  /** Current status of the job */
  status: ExportJobStatus;
  
  /** Firebase download URL when job is complete */
  fileUrl?: string;
  
  /** Error message if job failed */
  error?: string;
  
  /** Timestamp when job was created */
  createdAt: number;
  
  /** Timestamp when job was last updated */
  updatedAt: number;
  
  /** Resume ID being exported */
  resumeId: number;
  
  /** Template ID used for export */
  templateId: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Request payload for creating an export job
 */
export interface CreateExportJobRequest {
  /** Resume ID to export */
  resumeId: number;
  
  /** Template ID for the CV */
  templateId: string;
  
  /** CV data to render */
  cvData: ExportCVData;
  
  /** Optional filename for the PDF */
  fileName?: string;
  
  /** User's subscription package (affects watermark) */
  userPackage?: string;
  
  /** User ID for Firebase upload path */
  userId?: string;
}

/**
 * Response from creating an export job
 */
export interface CreateExportJobResponse {
  /** Job ID to poll for status */
  jobId: string;
  
  /** Initial status (always "processing") */
  status: "processing";
  
  /** Message for the client */
  message: string;
}

/**
 * Response from polling job status
 */
export interface GetExportJobResponse {
  /** Job ID */
  jobId: string;
  
  /** Current status */
  status: ExportJobStatus;
  
  /** Download URL when complete */
  fileUrl?: string;
  
  /** Error message if failed */
  error?: string;
}

// =============================================================================
// CV Data Types (for PDF rendering)
// =============================================================================

/**
 * CV data structure sent to the export API
 */
export interface ExportCVData {
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
  address?: string;
  linkedin?: string;
  photoUrl?: string;
  dob?: string;
  gender?: string;
  summary?: string;
  
  experience?: Array<{
    position: string;
    company: string;
    period: string;
    description: string;
  }>;
  
  education?: Array<{
    degree: string;
    institution: string;
    period: string;
    description?: string;
  }>;
  
  skills?: Array<{
    category: string;
    items: string[];
  }>;
  
  softSkills?: string[];
  
  languages?: Array<{
    name: string;
    level: string;
  }>;
  
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  
  projects?: Array<{
    name: string;
    description: string;
    period: string;
    url?: string;
  }>;
  
  awards?: string[];
}

// =============================================================================
// Hook Types
// =============================================================================

/**
 * State returned by useExportPDFJob hook
 */
export interface UseExportPDFJobState {
  /** Whether an export is in progress */
  isExporting: boolean;
  
  /** Current job status */
  status: ExportJobStatus | null;
  
  /** Progress message for UI */
  progressMessage: string;
  
  /** Error message if export failed */
  error: string | null;
  
  /** Download URL when complete */
  fileUrl: string | null;
}

/**
 * Actions returned by useExportPDFJob hook
 */
export interface UseExportPDFJobActions {
  /** Start a new export job */
  startExport: (request: CreateExportJobRequest) => Promise<string | null>;
  
  /** Reset the hook state */
  reset: () => void;
}

/**
 * Full return type of useExportPDFJob hook
 */
export type UseExportPDFJobReturn = UseExportPDFJobState & UseExportPDFJobActions;
