/**
 * Interview Scheduling API
 * Handles interview scheduling, confirmation, rescheduling, and management
 */

import api from './api';

// ==================== Types ====================

/**
 * Request to schedule a new interview
 * Backend expects: scheduledDate, durationMinutes, interviewType
 * interviewType must be: IN_PERSON, VIDEO_CALL, PHONE, or ONLINE_ASSESSMENT
 * Note: createdByRecruiterId is auto-filled from JWT token if not provided
 */
export interface ScheduleInterviewRequest {
  scheduledDate: string; // ISO datetime format (e.g., "2024-01-15T10:00:00")
  durationMinutes?: number; // Default: 60
  interviewType: 'IN_PERSON' | 'VIDEO_CALL' | 'PHONE' | 'ONLINE_ASSESSMENT';
  createdByRecruiterId?: number; // Optional - auto-filled from JWT if not provided
  location?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  interviewerPhone?: string;
  preparationNotes?: string;
  meetingLink?: string;
  interviewRound?: number; // Default: 1
}

/**
 * @deprecated Use ScheduleInterviewRequest with scheduledDate instead
 * This alias is kept for backward compatibility
 */
export interface LegacyScheduleInterviewRequest {
  interviewDateTime: string;
  durationMinutes: number;
  interviewType: 'PHONE' | 'VIDEO' | 'IN_PERSON' | 'TECHNICAL' | 'BEHAVIORAL' | 'PANEL' | 'FINAL';
  location?: string;
  meetingLink?: string;
  notes?: string;
}

export interface InterviewScheduleResponse {
  id: number;
  jobApplyId: number;
  interviewRound: number;
  scheduledDate: string;           // ISO DateTime - this is what backend returns
  durationMinutes: number;
  interviewType: 'IN_PERSON' | 'VIDEO_CALL' | 'PHONE' | 'ONLINE_ASSESSMENT' | 'ONLINE';
  location?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  interviewerPhone?: string;
  preparationNotes?: string;
  meetingLink?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
  candidateConfirmed: boolean;
  candidateConfirmedAt?: string;
  reminderSent24h: boolean;
  reminderSent2h: boolean;
  interviewCompletedAt?: string;
  interviewerNotes?: string;
  outcome?: 'PASS' | 'FAIL' | 'PENDING' | 'NEEDS_SECOND_ROUND';
  result?: 'PASS' | 'FAIL' | 'PENDING' | 'NEEDS_SECOND_ROUND'; // Alias for outcome
  feedback?: string;              // Interviewer feedback after completion
  createdByRecruiterId: number;
  createdAt: string;
  updatedAt: string;
  // Computed fields from backend
  expectedEndTime?: string;
  hasInterviewTimePassed?: boolean;
  isInterviewInProgress?: boolean;
  hoursUntilInterview?: number;
  // Candidate fields from backend
  candidateId?: number;
  candidateName?: string;
  candidatePhone?: string;
  candidateEmail?: string;
  candidateImage?: string;
  // Job fields
  jobId?: number;
  jobTitle?: string;
  positionTitle?: string; // Alias for jobTitle
  // Company fields (for candidate view)
  companyId?: number;
  companyName?: string;
  companyLogo?: string;
  companyWebsite?: string;
  recruiterId?: number;
  rescheduleRequests?: RescheduleRequestResponse[];
  // Legacy alias for backward compatibility
  interviewDateTime?: string; // Maps to scheduledDate
}

export interface RescheduleRequest {
  newRequestedDate: string; // ISO datetime format - this is what backend expects
  reason: string; // 10-1000 chars required
  requestedBy?: 'RECRUITER' | 'CANDIDATE'; // Backend expects this
  requiresConsent?: boolean;
}

/**
 * Request to update an existing interview (direct reschedule by recruiter)
 * All fields are optional - only provided fields will be updated
 * If scheduledDate changes, candidateConfirmed resets to false
 */
export interface UpdateInterviewRequest {
  scheduledDate?: string;        // ISO DateTime - if changed, triggers re-confirmation
  durationMinutes?: number;      // Positive integer
  interviewType?: 'IN_PERSON' | 'VIDEO_CALL' | 'PHONE' | 'ONLINE_ASSESSMENT';
  location?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  interviewerPhone?: string;
  preparationNotes?: string;
  meetingLink?: string;
  interviewRound?: number;
  updateReason?: string;         // Optional reason shown in notification to candidate
}

/**
 * @deprecated Use RescheduleRequest with newRequestedDate instead
 */
export interface LegacyRescheduleRequest {
  newInterviewDateTime: string;
  newDurationMinutes?: number;
  reason: string;
}

export interface RescheduleRequestResponse {
  id: number;
  interviewId: number;
  requestedBy: 'RECRUITER' | 'CANDIDATE';
  requesterId: number;
  currentDateTime: string;
  proposedDateTime: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  respondedBy?: string;
  respondedAt?: string;
  responseMessage?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

// ==================== Interview Scheduling ====================

/**
 * Schedule a new interview for a job application
 * POST /api/job-applies/{jobApplyId}/schedule-interview
 */
export const scheduleInterview = async (
  jobApplyId: number,
  request: ScheduleInterviewRequest
): Promise<InterviewScheduleResponse> => {
  try {
    console.log(`📅 [SCHEDULE INTERVIEW] Job Apply ID: ${jobApplyId}`, request);
    const response = await api.post<ApiResponse<InterviewScheduleResponse>>(
      `/api/job-applies/${jobApplyId}/schedule-interview`,
      request
    );
    console.log('✅ [SCHEDULE INTERVIEW] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [SCHEDULE INTERVIEW] Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      fullError: error,
    });
    const errorMessage = error.response?.data?.message 
      || error.response?.data?.error 
      || error.message 
      || 'Failed to schedule interview';
    throw new Error(errorMessage);
  }
};

/**
 * Get interview by ID - used for reschedule pre-fill
 * GET /api/interviews/{interviewId}
 */
export const getInterviewById = async (
  interviewId: number
): Promise<InterviewScheduleResponse> => {
  try {
    console.log(`📅 [GET INTERVIEW] Interview ID: ${interviewId}`);
    const response = await api.get<ApiResponse<InterviewScheduleResponse>>(
      `/api/interviews/${interviewId}`
    );
    console.log('✅ [GET INTERVIEW] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [GET INTERVIEW] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to fetch interview');
  }
};

/**
 * Get existing interview by Job Apply ID - Phase 12 API
 * GET /api/job-applies/{jobApplyId}/interview
 * Used for reschedule pre-fill when clicking "Reschedule" on a candidate with INTERVIEW_SCHEDULED status
 * 
 * Returns: { found: true, interview: data } if interview exists
 *          { found: false } if no interview exists (404)
 *          Throws on actual errors
 */
export const getInterviewByJobApplyId = async (
  jobApplyId: number
): Promise<{ found: true; interview: InterviewScheduleResponse } | { found: false }> => {
  try {
    console.log(`📅 [GET INTERVIEW BY JOB APPLY ID] JobApplyId: ${jobApplyId}`);
    const response = await api.get<ApiResponse<InterviewScheduleResponse>>(
      `/api/job-applies/${jobApplyId}/interview`
    );
    console.log('✅ [GET INTERVIEW BY JOB APPLY ID] Response:', response.data);
    
    // Handle both wrapped (result) and direct response formats
    // Some backends return {result: data}, others return data directly
    const interview = response.data.result || response.data as unknown as InterviewScheduleResponse;
    
    // Check if we have valid interview data
    if (interview && interview.id) {
      console.log('✅ [GET INTERVIEW BY JOB APPLY ID] Found interview with ID:', interview.id);
      return { found: true, interview };
    }
    console.log('⚠️ [GET INTERVIEW BY JOB APPLY ID] Empty or invalid result in response');
    return { found: false };
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.log('🔍 [GET INTERVIEW BY JOB APPLY ID] Caught error:', { status, errorData, error: error.message });
    
    // 404 means no interview exists for this application - this is expected
    if (status === 404) {
      console.log('⚠️ [GET INTERVIEW BY JOB APPLY ID] No interview found (404) for jobApplyId:', jobApplyId);
      return { found: false };
    }
    
    // 403 means candidate is trying to access another candidate's interview (ownership validation)
    if (status === 403) {
      console.warn('⚠️ [GET INTERVIEW BY JOB APPLY ID] No permission (403) for jobApplyId:', jobApplyId, 
        '- Candidate can only view their own interviews');
      return { found: false };
    }
    
    // 401 means not authenticated - treat as no data to prevent page crash
    if (status === 401) {
      console.warn('⚠️ [GET INTERVIEW BY JOB APPLY ID] Not authenticated (401) for jobApplyId:', jobApplyId);
      return { found: false };
    }
    
    // 500 or other server errors - treat as no data available
    if (status >= 500) {
      console.warn('⚠️ [GET INTERVIEW BY JOB APPLY ID] Server error (', status, ') for jobApplyId:', jobApplyId);
      return { found: false };
    }
    
    // Network error or no response - treat as no data available
    if (!status) {
      console.warn('⚠️ [GET INTERVIEW BY JOB APPLY ID] Network error or no response for jobApplyId:', jobApplyId);
      return { found: false };
    }
    
    // All other errors - log but don't crash the page
    console.error('❌ [GET INTERVIEW BY JOB APPLY ID] Unexpected error:', {
      status,
      message: errorData?.message,
      code: errorData?.code,
      data: errorData
    });
    // Return found: false instead of throwing to prevent page crash
    return { found: false };
  }
};

/**
 * Update an existing interview (direct reschedule by recruiter) - Phase 12 API
 * PUT /api/interviews/{interviewId}
 * If scheduledDate changes, candidateConfirmed resets to false and notification is sent
 * Cannot update interviews with status: COMPLETED, CANCELLED, NO_SHOW
 */
export const updateInterview = async (
  interviewId: number,
  request: UpdateInterviewRequest
): Promise<InterviewScheduleResponse> => {
  try {
    // Clean up the request - remove undefined/null/empty string values
    const cleanRequest: UpdateInterviewRequest = {};
    if (request.scheduledDate) cleanRequest.scheduledDate = request.scheduledDate;
    if (request.durationMinutes) cleanRequest.durationMinutes = request.durationMinutes;
    if (request.interviewType) cleanRequest.interviewType = request.interviewType;
    if (request.location) cleanRequest.location = request.location;
    if (request.meetingLink) cleanRequest.meetingLink = request.meetingLink;
    if (request.preparationNotes) cleanRequest.preparationNotes = request.preparationNotes;
    if (request.updateReason) cleanRequest.updateReason = request.updateReason;
    if (request.interviewerName) cleanRequest.interviewerName = request.interviewerName;
    if (request.interviewerEmail) cleanRequest.interviewerEmail = request.interviewerEmail;
    if (request.interviewerPhone) cleanRequest.interviewerPhone = request.interviewerPhone;
    if (request.interviewRound) cleanRequest.interviewRound = request.interviewRound;
    
    console.log(`📅 [UPDATE INTERVIEW] Interview ID: ${interviewId}`);
    console.log(`📅 [UPDATE INTERVIEW] Original request:`, request);
    console.log(`📅 [UPDATE INTERVIEW] Clean request:`, cleanRequest);
    
    const response = await api.put<ApiResponse<InterviewScheduleResponse>>(
      `/api/interviews/${interviewId}`,
      cleanRequest
    );
    console.log('✅ [UPDATE INTERVIEW] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [UPDATE INTERVIEW] Error:', error.response?.data || error);
    console.error('❌ [UPDATE INTERVIEW] Full error:', error);
    throw new Error(error.response?.data?.message || 'Failed to update interview');
  }
};

// ==================== Interview Management ====================

/**
 * Response format from backend for interview list endpoints
 */
interface InterviewListResponse {
  recruiterId?: number;
  candidateId?: number;
  count: number;
  interviews: InterviewScheduleResponse[];
}

/**
 * Get upcoming interviews for a recruiter
 * GET /api/interviews/recruiter/upcoming
 * Backend extracts recruiterId from JWT token automatically
 */
export const getRecruiterUpcomingInterviews = async (): Promise<InterviewScheduleResponse[]> => {
  try {
    console.log(`📅 [GET RECRUITER INTERVIEWS] Fetching (ID from JWT)`);
    const response = await api.get<ApiResponse<InterviewListResponse>>(
      `/api/interviews/recruiter/upcoming`
    );
    console.log('✅ [GET RECRUITER INTERVIEWS] Response:', response.data);
    // Backend returns { recruiterId, count, interviews } directly OR wrapped in result
    const data = response.data.result || response.data;
    return (data as InterviewListResponse)?.interviews || [];
  } catch (error: any) {
    console.error('❌ [GET RECRUITER INTERVIEWS] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to fetch recruiter interviews');
  }
};

/**
 * Get upcoming interviews for a candidate
 * GET /api/interviews/candidate/upcoming
 * Backend extracts candidateId from JWT token automatically
 */
export const getCandidateUpcomingInterviews = async (): Promise<InterviewScheduleResponse[]> => {
  try {
    console.log(`📅 [GET CANDIDATE INTERVIEWS] Fetching (ID from JWT)`);
    const response = await api.get<ApiResponse<InterviewListResponse>>(
      `/api/interviews/candidate/upcoming`
    );
    console.log('✅ [GET CANDIDATE INTERVIEWS] Response:', response.data);
    // Backend returns { candidateId, count, interviews } directly OR wrapped in result
    const data = response.data.result || response.data;
    return (data as InterviewListResponse)?.interviews || [];
  } catch (error: any) {
    console.error('❌ [GET CANDIDATE INTERVIEWS] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to fetch candidate interviews');
  }
};

/**
 * Get past interviews for a candidate
 * GET /api/interviews/candidate/past
 * Backend extracts candidateId from JWT token automatically
 */
export const getCandidatePastInterviews = async (): Promise<InterviewScheduleResponse[]> => {
  try {
    console.log(`📅 [GET CANDIDATE PAST INTERVIEWS] Fetching (ID from JWT)`);
    const response = await api.get<ApiResponse<InterviewListResponse>>(
      `/api/interviews/candidate/past`
    );
    console.log('✅ [GET CANDIDATE PAST INTERVIEWS] Response:', response.data);
    // Backend returns { candidateId, count, interviews } directly OR wrapped in result
    const data = response.data.result || response.data;
    return (data as InterviewListResponse)?.interviews || [];
  } catch (error: any) {
    console.error('❌ [GET PAST INTERVIEWS] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to fetch past interviews');
  }
};

/**
 * Get scheduled interviews for a recruiter (including past that need completion)
 * GET /api/interviews/recruiter/scheduled
 * Backend extracts recruiterId from JWT token automatically
 * Returns interviews with status SCHEDULED or CONFIRMED regardless of time
 */
export const getRecruiterScheduledInterviews = async (): Promise<InterviewScheduleResponse[]> => {
  try {
    console.log(`📅 [GET RECRUITER SCHEDULED] Fetching (ID from JWT)`);
    const response = await api.get<ApiResponse<InterviewListResponse>>(
      `/api/interviews/recruiter/scheduled`
    );
    console.log('✅ [GET RECRUITER SCHEDULED] Response:', response.data);
    const data = response.data.result || response.data;
    return (data as InterviewListResponse)?.interviews || [];
  } catch (error: any) {
    console.error('❌ [GET RECRUITER SCHEDULED] Error:', error.response?.data || error);
    // Return empty array if endpoint doesn't exist - fallback to upcoming only
    return [];
  }
};

// ==================== Interview Actions ====================

/**
 * Confirm interview attendance (candidate action)
 * POST /api/interviews/{interviewId}/confirm
 */
export const confirmInterview = async (interviewId: number): Promise<InterviewScheduleResponse> => {
  try {
    console.log(`✅ [CONFIRM INTERVIEW] Interview ID: ${interviewId}`);
    const response = await api.post<ApiResponse<InterviewScheduleResponse>>(
      `/api/interviews/${interviewId}/confirm`
    );
    console.log('✅ [CONFIRM INTERVIEW] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [CONFIRM INTERVIEW] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to confirm interview');
  }
};

/**
 * Complete an interview (recruiter action)
 * POST /api/interviews/{interviewId}/complete
 */
export const completeInterview = async (
  interviewId: number,
  outcome: 'PASS' | 'FAIL' | 'PENDING' | 'NEEDS_SECOND_ROUND',
  interviewerNotes?: string
): Promise<InterviewScheduleResponse> => {
  try {
    console.log(`✅ [COMPLETE INTERVIEW] Interview ID: ${interviewId}, Outcome: ${outcome}`);
    const response = await api.post<ApiResponse<InterviewScheduleResponse>>(
      `/api/interviews/${interviewId}/complete`,
      { outcome, interviewerNotes }
    );
    console.log('✅ [COMPLETE INTERVIEW] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [COMPLETE INTERVIEW] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to complete interview');
  }
};

/**
 * Mark interview as no-show (recruiter action)
 * POST /api/interviews/{interviewId}/no-show?notes=...
 * Effect: Interview status → NO_SHOW, Job application status → REJECTED
 */
export const markInterviewNoShow = async (
  interviewId: number,
  notes?: string
): Promise<InterviewScheduleResponse> => {
  try {
    console.log(`❌ [MARK NO-SHOW] Interview ID: ${interviewId}`);
    const response = await api.post<ApiResponse<InterviewScheduleResponse>>(
      `/api/interviews/${interviewId}/no-show`,
      null,
      { params: { notes } }
    );
    console.log('✅ [MARK NO-SHOW] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [MARK NO-SHOW] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to mark interview as no-show');
  }
};

/**
 * Cancel an interview
 * POST /api/interviews/{interviewId}/cancel
 */
export const cancelInterview = async (
  interviewId: number,
  reason: string
): Promise<InterviewScheduleResponse> => {
  try {
    console.log(`❌ [CANCEL INTERVIEW] Interview ID: ${interviewId}`);
    // Backend expects reason as query parameter, not body
    const response = await api.post<ApiResponse<InterviewScheduleResponse>>(
      `/api/interviews/${interviewId}/cancel`,
      null,
      { params: { reason } }
    );
    console.log('✅ [CANCEL INTERVIEW] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [CANCEL INTERVIEW] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to cancel interview');
  }
};

/**
 * Adjust interview duration
 * PATCH /api/interviews/{interviewId}/adjust-duration
 */
export const adjustInterviewDuration = async (
  interviewId: number,
  newDurationMinutes: number
): Promise<InterviewScheduleResponse> => {
  try {
    console.log(
      `⏱️ [ADJUST DURATION] Interview ID: ${interviewId}, New Duration: ${newDurationMinutes}min`
    );
    // Backend expects newDurationMinutes as query parameter, not body
    const response = await api.patch<ApiResponse<InterviewScheduleResponse>>(
      `/api/interviews/${interviewId}/adjust-duration`,
      null,
      { params: { newDurationMinutes } }
    );
    console.log('✅ [ADJUST DURATION] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [ADJUST DURATION] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to adjust interview duration');
  }
};

// ==================== Rescheduling ====================

/**
 * Request to reschedule an interview
 * POST /api/interviews/{interviewId}/reschedule
 */
export const requestReschedule = async (
  interviewId: number,
  request: RescheduleRequest
): Promise<RescheduleRequestResponse> => {
  try {
    console.log(`🔄 [REQUEST RESCHEDULE] Interview ID: ${interviewId}`, request);
    const response = await api.post<ApiResponse<RescheduleRequestResponse>>(
      `/api/interviews/${interviewId}/reschedule`,
      request
    );
    console.log('✅ [REQUEST RESCHEDULE] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [REQUEST RESCHEDULE] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to request reschedule');
  }
};

/**
 * Respond to a reschedule request
 * POST /api/interviews/reschedule-requests/{id}/respond
 */
export const respondToRescheduleRequest = async (
  requestId: number,
  approved: boolean,
  responseMessage?: string
): Promise<RescheduleRequestResponse> => {
  try {
    console.log(
      `📝 [RESPOND RESCHEDULE] Request ID: ${requestId}, Approved: ${approved}`
    );
    const response = await api.post<ApiResponse<RescheduleRequestResponse>>(
      `/api/interviews/reschedule-requests/${requestId}/respond`,
      { approved, responseMessage }
    );
    console.log('✅ [RESPOND RESCHEDULE] Response:', response.data);
    return response.data.result;
  } catch (error: any) {
    console.error('❌ [RESPOND RESCHEDULE] Error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to respond to reschedule request');
  }
};

// ==================== Utility Functions ====================

/**
 * Get interview type display text
 */
export const getInterviewTypeText = (
  type: InterviewScheduleResponse['interviewType']
): string => {
  const typeMap: Record<string, string> = {
    PHONE: 'Phone Interview',
    VIDEO_CALL: 'Video Interview',
    ONLINE: 'Video Interview',
    IN_PERSON: 'In-Person Interview',
    ONLINE_ASSESSMENT: 'Online Assessment',
  };
  return typeMap[type] || type;
};

/**
 * Get interview status color
 */
export const getInterviewStatusColor = (status: InterviewScheduleResponse['status']): string => {
  const colorMap: Record<string, string> = {
    SCHEDULED: 'bg-purple-100 text-purple-800 border-purple-300',
    CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-300',
    COMPLETED: 'bg-green-100 text-green-800 border-green-300',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
    NO_SHOW: 'bg-red-100 text-red-800 border-red-300',
    RESCHEDULED: 'bg-amber-100 text-amber-800 border-amber-300',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-300';
};

/**
 * Format interview date time
 */
export const formatInterviewDateTime = (dateTime: string): string => {
  try {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
};

/**
 * Check if interview requires candidate confirmation
 */
export const requiresConfirmation = (interview: InterviewScheduleResponse): boolean => {
  return interview.status === 'SCHEDULED' && !interview.candidateConfirmed;
};

/**
 * Check if interview is upcoming (within next 7 days)
 */
export const isUpcoming = (interview: InterviewScheduleResponse): boolean => {
  const now = new Date();
  const dateStr = interview.scheduledDate || interview.interviewDateTime;
  const interviewDate = new Date(dateStr || '');
  const diffDays = (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
};

/**
 * Check if interview is today
 */
export const isToday = (interview: InterviewScheduleResponse): boolean => {
  const now = new Date();
  const dateStr = interview.scheduledDate || interview.interviewDateTime;
  const interviewDate = new Date(dateStr || '');
  return (
    now.getDate() === interviewDate.getDate() &&
    now.getMonth() === interviewDate.getMonth() &&
    now.getFullYear() === interviewDate.getFullYear()
  );
};

/**
 * Get interview date/time string from response (handles both field names)
 */
export const getInterviewDateTimeStr = (interview: InterviewScheduleResponse): string => {
  return interview.scheduledDate || interview.interviewDateTime || '';
};
