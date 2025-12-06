"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Phone, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  RotateCcw,
  Mail,
  User,
  UserX,
  Briefcase,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  getRecruiterUpcomingInterviews,
  getRecruiterScheduledInterviews,
  completeInterview,
  cancelInterview,
  markInterviewNoShow,
  getInterviewTypeText,
  formatInterviewDateTime,
  getInterviewDateTimeStr,
  isToday,
  type InterviewScheduleResponse
} from "@/lib/interview-api";

export default function RecruiterInterviewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [upcomingInterviews, setUpcomingInterviews] = useState<InterviewScheduleResponse[]>([]);
  
  // Dialog states
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<InterviewScheduleResponse | null>(null);
  
  // Form states
  const [completeForm, setCompleteForm] = useState({
    outcome: "PASS" as "PASS" | "FAIL" | "PENDING" | "NEEDS_SECOND_ROUND",
    interviewerNotes: ""
  });
  const [cancelReason, setCancelReason] = useState("");
  const [noShowNotes, setNoShowNotes] = useState("");

  // Helper to check if interview has reached scheduled end time
  const hasInterviewEnded = (interview: InterviewScheduleResponse): boolean => {
    const dateStr = interview.scheduledDate || interview.interviewDateTime;
    if (!dateStr) return false;
    
    const startTime = new Date(dateStr).getTime();
    const endTime = startTime + (interview.durationMinutes || 60) * 60 * 1000;
    return Date.now() >= endTime;
  };

  // Helper to get time remaining until interview can be completed
  const getTimeUntilCanComplete = (interview: InterviewScheduleResponse): string => {
    const dateStr = interview.scheduledDate || interview.interviewDateTime;
    if (!dateStr) return "";
    
    const startTime = new Date(dateStr).getTime();
    const endTime = startTime + (interview.durationMinutes || 60) * 60 * 1000;
    const remaining = endTime - Date.now();
    
    if (remaining <= 0) return "";
    
    const minutes = Math.ceil(remaining / (60 * 1000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);

      console.log(`📅 [INTERVIEWS PAGE] Loading interviews (ID from JWT)`);
      
      // Fetch both upcoming and scheduled interviews (for past ones needing completion)
      const [upcomingData, scheduledData] = await Promise.all([
        getRecruiterUpcomingInterviews(),
        getRecruiterScheduledInterviews().catch(() => []) // Fallback if endpoint doesn't exist
      ]);
      
      console.log(`✅ [INTERVIEWS PAGE] Received ${upcomingData.length} upcoming, ${scheduledData.length} scheduled interviews`);
      
      // Combine and deduplicate by interview ID
      const allInterviewsMap = new Map<number, InterviewScheduleResponse>();
      
      // Add upcoming first
      upcomingData.forEach(interview => {
        if (interview.status !== "RESCHEDULED") {
          allInterviewsMap.set(interview.id, interview);
        }
      });
      
      // Add scheduled (past ones that need completion) - these take priority
      scheduledData.forEach(interview => {
        if (interview.status !== "RESCHEDULED" && interview.status !== "COMPLETED" && interview.status !== "CANCELLED") {
          allInterviewsMap.set(interview.id, interview);
        }
      });
      
      const interviews = Array.from(allInterviewsMap.values());
      
      // Sort by date (most urgent first - past/today before future)
      interviews.sort((a, b) => {
        const dateA = new Date(a.scheduledDate || a.interviewDateTime || '').getTime();
        const dateB = new Date(b.scheduledDate || b.interviewDateTime || '').getTime();
        return dateA - dateB;
      });
      
      console.log(`✅ [INTERVIEWS PAGE] Total unique interviews: ${interviews.length}`);
      
      setUpcomingInterviews(interviews);
      
      if (interviews.length === 0) {
        console.log("⚠️ [INTERVIEWS PAGE] No interviews returned from API");
      }
    } catch (error: any) {
      console.error("Failed to load interviews:", error);
      toast.error(error.response?.data?.message || "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteInterview = async () => {
    if (!selectedInterview) return;
    
    if (!completeForm.interviewerNotes.trim()) {
      toast.error("Please provide interviewer notes");
      return;
    }

    try {
      await completeInterview(
        selectedInterview.id,
        completeForm.outcome,
        completeForm.interviewerNotes
      );
      
      // Show appropriate success message based on outcome
      if (completeForm.outcome === "NEEDS_SECOND_ROUND") {
        toast.success("Interview marked for another round. Please schedule a new interview for this candidate.");
      } else if (completeForm.outcome === "PASS") {
        toast.success("Interview completed. Candidate has been approved!");
      } else if (completeForm.outcome === "FAIL") {
        toast.success("Interview completed. Application has been rejected.");
      } else {
        toast.success("Interview completed successfully");
      }
      
      setCompleteDialogOpen(false);
      setCompleteForm({ outcome: "PASS", interviewerNotes: "" });
      loadInterviews();
    } catch (error: any) {
      console.error("Failed to complete interview:", error);
      toast.error(error.message || "Failed to complete interview");
    }
  };

  const handleCancelInterview = async () => {
    if (!selectedInterview) return;

    try {
      await cancelInterview(selectedInterview.id);
      toast.success("Interview cancelled");
      setCancelDialogOpen(false);
      setCancelReason("");
      loadInterviews();
    } catch (error: any) {
      console.error("Failed to cancel interview:", error);
      toast.error(error.response?.data?.message || "Failed to cancel interview");
    }
  };

  const handleNoShow = async () => {
    if (!selectedInterview) return;

    try {
      await markInterviewNoShow(selectedInterview.id, noShowNotes || undefined);
      toast.success("Interview marked as no-show. Application has been rejected.");
      setNoShowDialogOpen(false);
      setNoShowNotes("");
      loadInterviews();
    } catch (error: any) {
      console.error("Failed to mark no-show:", error);
      toast.error(error.message || "Failed to mark as no-show");
    }
  };

  const getInterviewStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      SCHEDULED: { variant: "outline", label: "Scheduled" },
      CONFIRMED: { variant: "default", label: "Confirmed" },
      COMPLETED: { variant: "secondary", label: "Completed" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
      NO_SHOW: { variant: "destructive", label: "No Show" },
      RESCHEDULED: { variant: "outline", label: "Needs Rescheduling" }
    };
    
    const { variant, label } = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getInterviewTypeIcon = (type: string) => {
    switch (type) {
      case "PHONE": return <Phone className="h-4 w-4" />;
      case "VIDEO": 
      case "VIDEO_CALL":
      case "ONLINE": return <Video className="h-4 w-4" />;
      case "IN_PERSON": return <MapPin className="h-4 w-4" />;
      case "PANEL": return <Users className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Interview Management</h1>
        <p className="text-muted-foreground">
          Manage your scheduled interviews and complete past interviews
        </p>
      </div>

      <div className="space-y-4">
        {upcomingInterviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Upcoming Interviews</h3>
              <p className="text-muted-foreground">
                You don't have any scheduled interviews at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          upcomingInterviews.map((interview) => {
            const canComplete = hasInterviewEnded(interview) && interview.status !== "COMPLETED" && interview.status !== "CANCELLED";
            return (
            <Card key={interview.id} className={canComplete ? "border-orange-500 border-2" : isToday(interview) ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getInterviewTypeIcon(interview.interviewType)}
                      <CardTitle className="text-xl">
                        {getInterviewTypeText(interview.interviewType)}
                      </CardTitle>
                      {canComplete && (
                        <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Ready to Complete
                        </Badge>
                      )}
                      {!canComplete && isToday(interview) && (
                        <Badge variant="destructive">Today</Badge>
                      )}
                    </div>
                    <CardDescription className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">
                        {interview.candidateName || 'Unknown Candidate'}
                      </span>
                      {(interview.jobTitle || interview.positionTitle) && (
                        <span className="flex items-center gap-1.5 text-xs">
                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                          <span>Applying for: </span>
                          {interview.jobId ? (
                            <a
                              href={`/jobs-detail?id=${interview.jobId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {interview.jobTitle || interview.positionTitle}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="font-medium">{interview.jobTitle || interview.positionTitle}</span>
                          )}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {getInterviewStatusBadge(interview.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatInterviewDateTime(getInterviewDateTimeStr(interview))}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{interview.durationMinutes} minutes</span>
                    </div>
                    {interview.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{interview.location}</span>
                      </div>
                    )}
                    {interview.meetingLink && (
                      <div className="flex items-center gap-2 text-sm">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={interview.meetingLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Join Meeting
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Candidate Contact Info */}
                  {(interview.candidateEmail || interview.candidatePhone) && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1 text-sm font-medium mb-2">
                        <User className="h-4 w-4" />
                        <span>Candidate Contact</span>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {interview.candidateEmail && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`mailto:${interview.candidateEmail}`}
                              className="text-primary hover:underline"
                            >
                              {interview.candidateEmail}
                            </a>
                          </div>
                        )}
                        {interview.candidatePhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`tel:${interview.candidatePhone}`}
                              className="text-primary hover:underline"
                            >
                              {interview.candidatePhone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {interview.preparationNotes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4 inline mr-1" />
                        {interview.preparationNotes}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <div className="relative group">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedInterview(interview);
                          setCompleteDialogOpen(true);
                        }}
                        disabled={interview.status === "COMPLETED" || !hasInterviewEnded(interview)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                      {!hasInterviewEnded(interview) && interview.status !== "COMPLETED" && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          Available in {getTimeUntilCanComplete(interview)}
                        </div>
                      )}
                    </div>
                    {/* No-Show button - only for past interviews */}
                    {hasInterviewEnded(interview) && interview.status !== "COMPLETED" && interview.status !== "CANCELLED" && interview.status !== "NO_SHOW" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                        onClick={() => {
                          setSelectedInterview(interview);
                          setNoShowDialogOpen(true);
                        }}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        No-Show
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/recruiter/interviews/schedule?applicationId=${interview.jobApplyId}&action=reschedule&interviewId=${interview.id}`)}
                      disabled={interview.status === "COMPLETED" || hasInterviewEnded(interview)}
                      title={hasInterviewEnded(interview) ? "Cannot reschedule past interviews" : "Reschedule interview"}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedInterview(interview);
                        setCancelDialogOpen(true);
                      }}
                      disabled={interview.status === "COMPLETED"}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
          )}
        </div>

      {/* Complete Interview Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Interview</DialogTitle>
            <DialogDescription>
              Select the interview outcome and provide notes. This will update the candidate's application status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Interview Outcome *</Label>
              <RadioGroup
                value={completeForm.outcome}
                onValueChange={(value: any) =>
                  setCompleteForm({ ...completeForm, outcome: value })
                }
                className="space-y-2"
              >
                {/* PASS */}
                <div 
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    completeForm.outcome === "PASS" 
                      ? "border-green-500 bg-green-50" 
                      : "border-gray-200 hover:border-green-300"
                  }`}
                  onClick={() => setCompleteForm({ ...completeForm, outcome: "PASS" })}
                >
                  <RadioGroupItem value="PASS" id="pass" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="pass" className="cursor-pointer font-medium flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Pass - Approve Candidate
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Candidate passed. You can mark them as Working when they start.
                    </p>
                  </div>
                </div>
                
                {/* FAIL */}
                <div 
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    completeForm.outcome === "FAIL" 
                      ? "border-red-500 bg-red-50" 
                      : "border-gray-200 hover:border-red-300"
                  }`}
                  onClick={() => setCompleteForm({ ...completeForm, outcome: "FAIL" })}
                >
                  <RadioGroupItem value="FAIL" id="fail" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="fail" className="cursor-pointer font-medium flex items-center">
                      <XCircle className="h-4 w-4 mr-2 text-red-600" />
                      Fail - Reject Candidate
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Candidate did not meet requirements. Application will be rejected.
                    </p>
                  </div>
                </div>
                
                {/* PENDING */}
                <div 
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    completeForm.outcome === "PENDING" 
                      ? "border-yellow-500 bg-yellow-50" 
                      : "border-gray-200 hover:border-yellow-300"
                  }`}
                  onClick={() => setCompleteForm({ ...completeForm, outcome: "PENDING" })}
                >
                  <RadioGroupItem value="PENDING" id="pending" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="pending" className="cursor-pointer font-medium flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                      Pending - Still Deciding
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Need more time to evaluate. Interview marked as completed.
                    </p>
                  </div>
                </div>
                
                {/* NEEDS_SECOND_ROUND */}
                <div 
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    completeForm.outcome === "NEEDS_SECOND_ROUND" 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setCompleteForm({ ...completeForm, outcome: "NEEDS_SECOND_ROUND" })}
                >
                  <RadioGroupItem value="NEEDS_SECOND_ROUND" id="needs-second-round" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="needs-second-round" className="cursor-pointer font-medium flex items-center">
                      <RotateCcw className="h-4 w-4 mr-2 text-blue-600" />
                      Needs Another Round
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Interview marked as RESCHEDULED. Candidate confirmation reset. Schedule a new interview.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interviewerNotes">Interviewer Notes *</Label>
              <Textarea
                id="interviewerNotes"
                placeholder="Provide detailed notes about the candidate's performance, strengths, areas of concern..."
                value={completeForm.interviewerNotes}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, interviewerNotes: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCompleteInterview}>
              Complete Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Interview Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Interview</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this interview? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Provide a reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep Interview
            </Button>
            <Button variant="destructive" onClick={handleCancelInterview}>
              Cancel Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No-Show Dialog */}
      <Dialog open={noShowDialogOpen} onOpenChange={setNoShowDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-orange-500" />
              Mark as No-Show
            </DialogTitle>
            <DialogDescription>
              The candidate did not attend the interview. This will reject their application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                <strong>Warning:</strong> Marking as no-show will automatically reject the candidate's application.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="no-show-notes">Notes (optional)</Label>
              <Textarea
                id="no-show-notes"
                placeholder="Additional notes about the no-show..."
                value={noShowNotes}
                onChange={(e) => setNoShowNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNoShowDialogOpen(false);
                setNoShowNotes("");
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleNoShow}
            >
              <UserX className="h-4 w-4 mr-1" />
              Mark No-Show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
