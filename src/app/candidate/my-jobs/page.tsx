"use client";

import { useState, useEffect, lazy, Suspense, useMemo, useCallback, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientHeader, ClientFooter } from "@/modules/client/components";
import CVSidebar from "@/components/layout/CVSidebar";
import Link from "next/link";
import { useLayout } from "@/contexts/LayoutContext";
import { useAuthStore } from "@/store/use-auth-store";
import {
  fetchMyJobApplications,
  formatApplicationDate,
  type JobApplication
} from "@/lib/my-jobs-api";
import {
  fetchSavedJobs,
  // fetchViewedJobs, // TODO: Uncomment when view job feedback feature is ready
  type SavedJobFeedback
} from "@/lib/job-api";
import { updateJobApplicationStatus } from "@/lib/recruiter-api";
import { getDaysDiff } from "@/lib/my-jobs-utils";
import { ClockIcon, BriefcaseIcon, ChevronDownIcon } from "@/components/ui/icons";
import { StatusBadgeFull } from "@/components/shared/StatusBadge";
import { getCandidateActions, requiresCandidateAction } from "@/lib/status-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import {
  getInterviewByJobApplyId,
  formatInterviewDateTime,
  getInterviewDateTimeStr,
  getInterviewTypeText,
  type InterviewScheduleResponse
} from "@/lib/interview-api";
import { Calendar, Video, MapPin, ExternalLink, BriefcaseBusiness } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Lazy load tab components for better code splitting
const SavedJobsTab = lazy(() => import("./SavedJobsTab"));
// const RecentJobsTab = lazy(() => import("./RecentJobsTab")); // TODO: Uncomment when view job feedback feature is ready

type TabType = "applied" | "saved"; // Removed "recent" temporarily

// Skeleton loading component for job cards
const JobCardSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-6 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const MyJobsPage = () => {
  // Get candidateId from global auth store
  const { candidateId, fetchCandidateProfile } = useAuthStore();
  const { headerHeight } = useLayout();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get tab from URL or default to "applied" - persist tab state in URL
  const urlTab = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(urlTab || "applied");

  // Sync tab state with URL
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // State for job applications
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJobFeedback[]>([]);
  // const [viewedJobs, setViewedJobs] = useState<SavedJobFeedback[]>([]); // TODO: Uncomment when view job feedback feature is ready

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Loaded flags to prevent re-fetching on tab switch
  const [savedLoaded, setSavedLoaded] = useState(false);
  // const [viewedLoaded, setViewedLoaded] = useState(false); // TODO: Uncomment when view job feedback feature is ready

  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  // Interview states
  const [interviewsMap, setInterviewsMap] = useState<Record<number, InterviewScheduleResponse>>({});
  const [interviewDetailOpen, setInterviewDetailOpen] = useState(false);
  const [selectedInterviewDetail, setSelectedInterviewDetail] = useState<InterviewScheduleResponse | null>(null);

  // Check and fetch candidateId if needed - run once on mount
  useEffect(() => {
    const initAuth = async () => {
      if (!candidateId) {
        try {
          await fetchCandidateProfile();
        } catch (error) {
          console.error("Failed to fetch candidate profile:", error);
        }
      }
      // Always set auth loading to false after checking
      setTimeout(() => setIsAuthLoading(false), 0);
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Fetch all data when candidateId becomes available
  useEffect(() => {
    if (!candidateId || isAuthLoading) {
      return;
    }

    const loadAllData = async () => {
      // Load applied jobs (main data - controls loading state)
      setIsLoading(true);
      try {
        const applications = await fetchMyJobApplications(candidateId);
        setJobApplications(applications);
      } catch (error: any) {
        toast.error('Failed to load job applications');
      } finally {
        setIsLoading(false);
      }

      // Load saved jobs in background (don't block UI)
      fetchSavedJobs(candidateId)
        .then(jobs => {
          setSavedJobs(jobs);
          setSavedLoaded(true);
        })
        .catch(error => {
          console.error('Failed to load saved jobs:', error);
          setSavedLoaded(true);
        });

      /* TODO: Uncomment when view job feedback feature is ready
      // Load viewed jobs in background (don't block UI)
      fetchViewedJobs(candidateId)
        .then(jobs => {
          setViewedJobs(jobs);
          setViewedLoaded(true);
        })
        .catch(error => {
          console.error('Failed to load viewed jobs:', error);
          setViewedLoaded(true);
        });
      */
    };

    loadAllData();
  }, [candidateId, isAuthLoading]);

  // Memoize interview applications to avoid recalculating on every render
  const interviewApplications = useMemo(() => 
    jobApplications.filter(
      app => app.status === 'INTERVIEW_SCHEDULED' || app.status === 'INTERVIEWED'
    ),
    [jobApplications]
  );

  // Fetch interview details for applications with interview scheduled
  useEffect(() => {
    const fetchInterviews = async () => {
      const newInterviewsMap: Record<number, InterviewScheduleResponse> = {};
      
      await Promise.all(
        interviewApplications.map(async (app) => {
          try {
            const result = await getInterviewByJobApplyId(app.id);
            if (result.found) {
              newInterviewsMap[app.id] = result.interview;
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Failed to fetch interview for application ${app.id}:`, error);
            }
          }
        })
      );
      
      setInterviewsMap(newInterviewsMap);
    };

    if (interviewApplications.length > 0) {
      fetchInterviews();
    }
  }, [interviewApplications]);

  // Memoized handlers for stable references
  const handleJobUnsaved = useCallback((jobId: number) => {
    setSavedJobs(prev => prev.filter(job => job.jobId !== jobId));
  }, []);

  const toggleJobDetails = useCallback((jobId: number) => {
    setExpandedJobId(prev => prev === jobId ? null : jobId);
  }, []);

  // Open interview detail popup
  const openInterviewDetail = useCallback((interview: InterviewScheduleResponse) => {
    setSelectedInterviewDetail(interview);
    setInterviewDetailOpen(true);
  }, []);

  // Handle candidate actions
  const handleCandidateAction = useCallback(async (action: string, applicationId: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Action: ${action}, Application ID: ${applicationId}`);
    }
    
    try {
      switch (action) {
        case 'withdraw':
          if (confirm('Are you sure you want to withdraw your application? This action cannot be undone.')) {
            await updateJobApplicationStatus(applicationId, 'WITHDRAWN');
            toast.success('Application withdrawn successfully');
            // Refresh the job applications list
            const updatedApplications = await fetchMyJobApplications(candidateId!);
            setJobApplications(updatedApplications);
          }
          break;
          
        case 'confirm_interview':
          router.push(`/candidate/interviews?action=confirm&id=${applicationId}`);
          break;
          
        case 'request_reschedule':
          router.push(`/candidate/interviews?action=reschedule&id=${applicationId}`);
          break;
          
        case 'view_interview':
          router.push('/candidate/interviews');
          break;
          
        case 'submit_review':
          router.push(`/candidate/reviews/submit?jobApplyId=${applicationId}`);
          break;
          
        case 'view_employment':
          router.push('/candidate/employments');
          break;
          
        case 'appeal_ban':
          toast.error('Ban appeal process not yet implemented');
          break;
          
        case 'contact_support':
          // Open support contact (could be email or support page)
          window.location.href = 'mailto:support@careermate.com?subject=Support Request';
          break;
          
        case 'contact':
          toast.error('Company contact feature not yet implemented');
          break;
          
        default:
          toast.error('Unknown action');
      }
    } catch (error: any) {
      console.error('Action failed:', error);
      toast.error(error.response?.data?.message || 'Action failed. Please try again.');
    }
  }, [candidateId, router]);

  // Show loading state if still checking auth
  if (isAuthLoading) {
    return (
      <>
        <ClientHeader />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500"></div>
          </div>
        </main>
      </>
    );
  }

  // Show error if no candidateId after auth check
  if (!candidateId) {
    return (
      <>
        <ClientHeader />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-red-500 mb-4">Failed to load candidate profile</p>
            <Link href="/candidate/cm-profile" className="text-blue-600 hover:underline">
              Go to Profile
            </Link>
          </div>
        </main>
        <ClientFooter />
      </>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* GRID 2 cột: sidebar | content */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-6 items-start transition-all duration-300"
          style={{
            ["--sticky-offset" as any]: `${headerHeight || 0}px`,
            ["--content-pad" as any]: "24px",
          }}
        >
          {/* Sidebar trái: sticky + ẩn mobile */}
          <aside className="hidden lg:block sticky [top:calc(var(--sticky-offset)+var(--content-pad))] self-start transition-all duration-300">
            <CVSidebar activePage="jobs" />
          </aside>

          {/* Main Content */}
          <section className="space-y-6 min-w-0 transition-all duration-300">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                {/* <BriefcaseBusiness className="w-6 h-6" /> */}
                Job Activities
              </h1>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => handleTabChange("applied")}
                  className={`pb-3 px-1 mr-8 relative ${activeTab === "applied"
                    ? "text-gray-500 font-medium border-b-2 border-gray-500"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Applied Jobs
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-500 text-white rounded-full">
                    {jobApplications.length}
                  </span>
                </button>

                <button
                  onClick={() => handleTabChange("saved")}
                  className={`pb-3 px-1 mr-8 relative ${activeTab === "saved"
                    ? "text-gray-500 font-medium border-b-2 border-gray-500"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Saved Jobs
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-500 text-white rounded-full">
                    {savedJobs.length}
                  </span>
                </button>

                {/* TODO: Add "Recent Viewed Jobs" tab when view job feedback feature is ready */}
              </div>

              {/* Tab Content */}
              <div className="py-4">
                {activeTab === "applied" && (
                  <div>
                    <div className="flex items-center mb-8 text-gray-500 text-sm">
                      <ClockIcon className="w-4 h-4 mr-2" />
                      Your applied jobs are stored for the last 12 months.
                    </div>

                    {/* Loading State - Skeleton */}
                    {isLoading && <JobCardSkeleton />}

                    {/* Job Applications List */}
                    {!isLoading && jobApplications.length > 0 && (
                      <div className="space-y-4">
                        {jobApplications.map((application) => (
                          <div
                            key={application.id}
                            className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                          >
                            {/* Job Header */}
                            <div className="p-4 bg-white">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-600 font-semibold">
                                      {application.jobTitle.charAt(0)}
                                    </div>
                                    <div>
                                      <Link 
                                        href={`/jobs-detail?id=${application.jobPostingId}`}
                                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                                      >
                                        {application.jobTitle}
                                      </Link>
                                      <p className="text-sm text-gray-600">
                                        Applied on {formatApplicationDate(application.createAt)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <StatusBadgeFull 
                                      status={application.status} 
                                      size="md"
                                    />
                                    {/* Action Required badge - for INTERVIEW_SCHEDULED, only show if interview not confirmed */}
                                    {application.status === 'INTERVIEW_SCHEDULED' && interviewsMap[application.id] && !interviewsMap[application.id].candidateConfirmed && (
                                      <button
                                        onClick={() => router.push(`/candidate/interviews?action=confirm&id=${application.id}`)}
                                        className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse hover:bg-amber-200 cursor-pointer transition-colors"
                                      >
                                        Action Required
                                      </button>
                                    )}
                                    {/* Action Required badge - for APPROVED status (accept/decline offer) */}
                                    {application.status === 'APPROVED' && (
                                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                        Action Required
                                      </span>
                                    )}
                                    {new Date(application.expirationDate) < new Date() && (
                                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                        Expired
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Expand Button */}
                                <button
                                  onClick={() => toggleJobDetails(application.id)}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <ChevronDownIcon
                                    className={`text-gray-600 transition-transform ${expandedJobId === application.id ? 'rotate-180' : ''
                                      }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Expandable Details */}
                            {expandedJobId === application.id && (
                              <div className="border-t border-gray-200 bg-gray-50 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Application Details</h4>
                                    <div className="space-y-1 text-gray-600">
                                      <p><span className="font-medium">Full Name:</span> {application.fullName}</p>
                                      <p><span className="font-medium">Phone:</span> {application.phoneNumber}</p>
                                      <p><span className="font-medium">Preferred Location:</span> {application.preferredWorkLocation}</p>
                                      <p><span className="font-medium">CV:</span> {application.cvFilePath.split('/').pop()}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Cover Letter</h4>
                                    <p className="text-gray-600 whitespace-pre-wrap">
                                      {application.coverLetter || 'No cover letter provided'}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Interview Schedule Info Box */}
                                {(application.status === 'INTERVIEW_SCHEDULED' || application.status === 'INTERVIEWED') && interviewsMap[application.id] && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="p-2 bg-purple-100 rounded-lg">
                                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                          </div>
                                          <div>
                                            <h4 className="font-semibold text-purple-900 text-sm">
                                              {application.status === 'INTERVIEW_SCHEDULED' ? 'Upcoming Interview' : 'Interview Completed'}
                                            </h4>
                                            <p className="text-purple-700 text-sm">
                                              {formatInterviewDateTime(getInterviewDateTimeStr(interviewsMap[application.id]))}
                                            </p>
                                            <p className="text-purple-600 text-xs mt-1">
                                              {getInterviewTypeText(interviewsMap[application.id].interviewType)} • {interviewsMap[application.id].durationMinutes} min
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openInterviewDetail(interviewsMap[application.id])}
                                          className="text-purple-700 border-purple-300 hover:bg-purple-100"
                                        >
                                          View Details
                                        </Button>
                                      </div>
                                      
                                      {/* Quick info row */}
                                      <div className="mt-3 pt-3 border-t border-purple-200 flex flex-wrap gap-4 text-xs text-purple-700">
                                        {interviewsMap[application.id].location && (
                                          <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {interviewsMap[application.id].location}
                                          </span>
                                        )}
                                        {interviewsMap[application.id].meetingLink && (
                                          <a
                                            href={interviewsMap[application.id].meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-blue-600 hover:underline"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Join Meeting
                                          </a>
                                        )}
                                        {interviewsMap[application.id].candidateConfirmed ? (
                                          <span className="flex items-center gap-1 text-green-600">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Confirmed
                                          </span>
                                        ) : application.status === 'INTERVIEW_SCHEDULED' && (
                                          <span className="flex items-center gap-1 text-amber-600">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Awaiting Confirmation
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Interview Action Buttons - Show when not confirmed */}
                                      {application.status === 'INTERVIEW_SCHEDULED' && !interviewsMap[application.id].candidateConfirmed && (
                                        <div className="mt-3 pt-3 border-t border-purple-200 flex flex-wrap gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => router.push(`/candidate/interviews?action=confirm&id=${application.id}`)}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                          >
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Confirm Interview
                                          </Button>
                                        </div>
                                      )}
                                      
                                      {/* Contact for Reschedule - Show interviewer contact info */}
                                      {application.status === 'INTERVIEW_SCHEDULED' && interviewsMap[application.id] && (interviewsMap[application.id].interviewerEmail || interviewsMap[application.id].interviewerPhone) && (
                                        <div className="mt-3 pt-3 border-t border-purple-200">
                                          <p className="text-xs text-purple-700 mb-2 font-medium">Need to reschedule? Contact the interviewer:</p>
                                          <div className="flex flex-wrap gap-2">
                                            {interviewsMap[application.id].interviewerEmail && (
                                              <a
                                                href={`mailto:${interviewsMap[application.id].interviewerEmail}?subject=Interview Reschedule Request - ${application.jobTitle}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                              >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                {interviewsMap[application.id].interviewerEmail}
                                              </a>
                                            )}
                                            {interviewsMap[application.id].interviewerPhone && (
                                              <a
                                                href={`tel:${interviewsMap[application.id].interviewerPhone}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                              >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                {interviewsMap[application.id].interviewerPhone}
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Contact Information - Only visible when status >= APPROVED */}
                                {['APPROVED', 'ACCEPTED', 'WORKING'].includes(application.status) && application.companyEmail ? (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      Company Contact Information
                                    </h4>
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        {application.companyName && (
                                          <p className="text-gray-700">
                                            <span className="font-medium text-gray-900">Company:</span> {application.companyName}
                                          </p>
                                        )}
                                        {application.contactPerson && (
                                          <p className="text-gray-700">
                                            <span className="font-medium text-gray-900">Contact Person:</span> {application.contactPerson}
                                          </p>
                                        )}
                                        {application.companyEmail && (
                                          <p className="text-gray-700">
                                            <span className="font-medium text-gray-900">Email:</span>{' '}
                                            <a href={`mailto:${application.companyEmail}`} className="text-blue-600 hover:underline">
                                              {application.companyEmail}
                                            </a>
                                          </p>
                                        )}
                                        {application.recruiterPhone && (
                                          <p className="text-gray-700">
                                            <span className="font-medium text-gray-900">Phone:</span>{' '}
                                            <a href={`tel:${application.recruiterPhone}`} className="text-blue-600 hover:underline">
                                              {application.recruiterPhone}
                                            </a>
                                          </p>
                                        )}
                                        {application.companyAddress && (
                                          <p className="text-gray-700 md:col-span-2">
                                            <span className="font-medium text-gray-900">Address:</span> {application.companyAddress}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : !['APPROVED', 'ACCEPTED', 'WORKING'].includes(application.status) && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                      <p className="text-sm text-gray-600">
                                        Contact information will be available after your application is approved.
                                      </p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Action Buttons */}
                                {getCandidateActions(application.status).length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">Available Actions</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {getCandidateActions(application.status).map((statusAction) => (
                                        <Button
                                          key={statusAction.action}
                                          variant={statusAction.variant as any}
                                          size="sm"
                                          onClick={() => handleCandidateAction(statusAction.action, application.id)}
                                          className="text-sm"
                                        >
                                          {statusAction.label}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                                  <Link
                                    href={`/jobs-detail?id=${application.jobPostingId}`}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                                  >
                                    View Job Details
                                  </Link>
                                  <a
                                    href={`/${application.cvFilePath}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                                  >
                                    View CV
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && jobApplications.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="bg-gray-200 p-4 rounded-lg mb-4">
                          <BriefcaseIcon className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 mb-6">
                          You haven't applied to any jobs in the last 12 months.
                        </p>
                        <Link
                          href="/jobs-list"
                          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-md font-medium"
                        >
                          Explore jobs
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "saved" && (
                  <Suspense fallback={<JobCardSkeleton />}>
                    {!savedLoaded ? (
                      <JobCardSkeleton />
                    ) : (
                      <SavedJobsTab
                        savedJobs={savedJobs}
                        candidateId={candidateId}
                        onJobUnsaved={handleJobUnsaved}
                      />
                    )}
                  </Suspense>
                )}

                {/* TODO: Add "Recent Viewed Jobs" tab content when view job feedback feature is ready */}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Interview Detail Dialog */}
      <Dialog open={interviewDetailOpen} onOpenChange={setInterviewDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Chi tiết lịch phỏng vấn
            </DialogTitle>
          </DialogHeader>
          {selectedInterviewDetail && (
            <div className="space-y-4 mt-4">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Thời gian</p>
                  <p className="text-base font-semibold">
                    {formatInterviewDateTime(selectedInterviewDetail.scheduledTime)}
                  </p>
                  {selectedInterviewDetail.duration && (
                    <p className="text-sm text-gray-500">
                      Thời lượng: {selectedInterviewDetail.duration} phút
                    </p>
                  )}
                </div>
              </div>

              {/* Interview Type */}
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <Video className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Hình thức</p>
                  <Badge variant={selectedInterviewDetail.interviewType === 0 ? "default" : "secondary"}>
                    {getInterviewTypeText(selectedInterviewDetail.interviewType)}
                  </Badge>
                </div>
              </div>

              {/* Location/Meeting Link */}
              {selectedInterviewDetail.interviewType === 0 && selectedInterviewDetail.meetingLink && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <ExternalLink className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Link phỏng vấn</p>
                    <a
                      href={selectedInterviewDetail.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm break-all"
                    >
                      {selectedInterviewDetail.meetingLink}
                    </a>
                  </div>
                </div>
              )}

              {selectedInterviewDetail.interviewType === 1 && selectedInterviewDetail.location && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-orange-100 p-2">
                    <MapPin className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Địa điểm</p>
                    <p className="text-sm">{selectedInterviewDetail.location}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedInterviewDetail.notes && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Ghi chú</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedInterviewDetail.notes}
                  </p>
                </div>
              )}

              {/* Status */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Trạng thái xác nhận</span>
                  <Badge variant={selectedInterviewDetail.isConfirmed ? "default" : "outline"}>
                    {selectedInterviewDetail.isConfirmed ? "Đã xác nhận" : "Chờ xác nhận"}
                  </Badge>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <a
                  href="/candidate/interviews"
                  className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Quản lý lịch phỏng vấn
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};

export default MyJobsPage;
