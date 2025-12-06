"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  Briefcase,
  MapPin,
  Video,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getDailyCalendar,
  type DailyCalendarResponse,
} from "@/lib/calendar-api";
import { 
  scheduleInterview, 
  getInterviewById, 
  getInterviewByJobApplyId, 
  updateInterview,
  getRecruiterUpcomingInterviews,
  type UpdateInterviewRequest,
  type InterviewScheduleResponse
} from "@/lib/interview-api";
import { getApplicationById } from "@/lib/recruiter-api";

interface InterviewForm {
  jobApplyId: number;
  candidateId: number;
  candidateName: string;
  positionTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  interviewType: string;
  location: string;
  meetingLink: string;
  interviewerName: string;
  interviewerEmail: string;
  interviewerPhone: string;
  notes: string;
}

// SIMPLIFIED: Slot info with overlap count for visual indicator
interface TimeSlotInfo {
  time: string;
  interviewCount: number; // How many interviews overlap this slot
  interviews: Array<{
    id: number;
    candidateName: string;
    startMinutes: number;
    endMinutes: number;
  }>;
  isOwnInterview: boolean; // For reschedule mode
  isLunchTime: boolean; // Visual indicator only (not restriction)
}

const INTERVIEW_TYPES = [
  { value: "PHONE", label: "Phone Interview" },
  { value: "VIDEO_CALL", label: "Video Interview" },
  { value: "IN_PERSON", label: "In-Person Interview" },
  { value: "ONLINE_ASSESSMENT", label: "Online Assessment" },
];

const DURATIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

// Main page component with Suspense wrapper for useSearchParams
export default function ScheduleInterviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ScheduleInterviewContent />
    </Suspense>
  );
}

function ScheduleInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");
  const interviewIdParam = searchParams.get("interviewId");

  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isReschedule, setIsReschedule] = useState(false);
  const [originalInterview, setOriginalInterview] = useState<InterviewScheduleResponse | null>(null);
  
  const interviewRef = useRef<{ isReschedule: boolean; interview: InterviewScheduleResponse | null }>({
    isReschedule: false,
    interview: null
  });

  // SIMPLIFIED: All slots available, just track overlap count
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlotInfo[]>([]);
  const [dailyCalendar, setDailyCalendar] = useState<DailyCalendarResponse | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));

  const [form, setForm] = useState<InterviewForm>({
    jobApplyId: parseInt(applicationId || "0"),
    candidateId: 0,
    candidateName: "",
    positionTitle: "",
    scheduledDate: "",
    scheduledTime: "",
    durationMinutes: 60,
    interviewType: "VIDEO_CALL",
    location: "",
    meetingLink: "",
    interviewerName: "",
    interviewerEmail: "",
    interviewerPhone: "",
    notes: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      initializePage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (selectedDate) {
      loadTimeSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, form.durationMinutes]);

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function formatDateForAPI(date: Date): string {
    // Use local date components to avoid UTC timezone shift
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getWeekDates(startDate: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  function formatScheduledDateTime(date: string, time: string): string {
    const timeParts = time.split(':');
    const formattedTime = timeParts.length === 2 ? `${time}:00` : time;
    return `${date}T${formattedTime}`;
  }

  const initializePage = async () => {
    try {
      setLoading(true);
      
      let existingInterview: InterviewScheduleResponse | null = null;
      
      if (interviewIdParam) {
        try {
          existingInterview = await getInterviewById(parseInt(interviewIdParam));
        } catch (e) {
          console.log('Could not find interview by ID');
        }
      }
      
      if (!existingInterview && applicationId) {
        const jobApplyId = parseInt(applicationId);
        try {
          const result = await getInterviewByJobApplyId(jobApplyId);
          if (result.found) {
            existingInterview = result.interview;
          }
        } catch (e) {
          // Try fallback
          try {
            const allInterviews = await getRecruiterUpcomingInterviews();
            const matchingInterview = allInterviews.find(i => i.jobApplyId === jobApplyId);
            if (matchingInterview) {
              existingInterview = matchingInterview;
            }
          } catch (fallbackError) {
            console.error('Fallback failed:', fallbackError);
          }
        }
      }

      if (existingInterview) {
        setIsReschedule(true);
        setOriginalInterview(existingInterview);
        interviewRef.current = { isReschedule: true, interview: existingInterview };
        
        const dateTimeStr = existingInterview.scheduledDate || existingInterview.interviewDateTime || '';
        const interviewDate = new Date(dateTimeStr);
        const dateStr = formatDateForAPI(interviewDate);
        const timeStr = `${interviewDate.getHours().toString().padStart(2, '0')}:${interviewDate.getMinutes().toString().padStart(2, '0')}`;
        
        let candidateName = existingInterview.candidateName || '';
        let positionTitle = existingInterview.jobTitle || existingInterview.positionTitle || '';
        let candidateId = existingInterview.candidateId || 0;
        
        if (!candidateName || !positionTitle) {
          try {
            const appResponse = await getApplicationById(existingInterview.jobApplyId);
            if (appResponse.result) {
              candidateName = candidateName || appResponse.result.fullName || 'Unknown Candidate';
              positionTitle = positionTitle || appResponse.result.jobTitle || 'Unknown Position';
              candidateId = candidateId || appResponse.result.candidateId || 0;
            }
          } catch (e) {
            console.error('Failed to fetch application:', e);
          }
        }
        
        setForm(prev => ({
          ...prev,
          jobApplyId: existingInterview!.jobApplyId,
          candidateId,
          candidateName: candidateName || 'Unknown Candidate',
          positionTitle: positionTitle || 'Unknown Position',
          durationMinutes: existingInterview!.durationMinutes,
          interviewType: existingInterview!.interviewType as string,
          location: existingInterview!.location || '',
          meetingLink: existingInterview!.meetingLink || '',
          interviewerName: existingInterview!.interviewerName || '',
          interviewerEmail: existingInterview!.interviewerEmail || '',
          interviewerPhone: existingInterview!.interviewerPhone || '',
          notes: existingInterview!.preparationNotes || '',
          scheduledDate: dateStr,
          scheduledTime: timeStr,
        }));
        
        setSelectedDate(dateStr);
        setCurrentWeekStart(getWeekStart(interviewDate));
        toast.info("Update interview details or select a new time to reschedule.");
      } else if (applicationId) {
        const jobApplyId = parseInt(applicationId);
        try {
          const appResponse = await getApplicationById(jobApplyId);
          if (appResponse.result) {
            setForm(prev => ({
              ...prev,
              jobApplyId: appResponse.result.id,
              candidateId: appResponse.result.candidateId,
              candidateName: appResponse.result.fullName || 'Unknown Candidate',
              positionTitle: appResponse.result.jobTitle || 'Unknown Position',
            }));
          }
        } catch (e) {
          toast.error("Failed to load application details");
        }
      }

      if (!selectedDate) {
        const today = new Date();
        const todayStr = formatDateForAPI(today);
        setSelectedDate(todayStr);
        setForm(prev => ({ ...prev, scheduledDate: todayStr }));
      }
    } catch (error) {
      console.error("Failed to initialize page:", error);
      toast.error("Failed to load page data");
    } finally {
      setLoading(false);
    }
  };

  /**
   * SIMPLIFIED: Generate all time slots with overlap count
   * All slots are available - just show how many interviews overlap
   */
  const generateTimeSlots = (
    calendar: DailyCalendarResponse | null,
    currentInterviewId?: number
  ): TimeSlotInfo[] => {
    // Default to 8 AM - 8 PM for flexibility (overtime allowed)
    let startHour = 8;
    let startMin = 0;
    let endHour = 20;
    let endMin = 0;
    
    // Use configured hours if available
    if (calendar?.workStartTime) {
      if (typeof calendar.workStartTime === 'string') {
        const [h, m] = calendar.workStartTime.split(':').map(Number);
        startHour = h;
        startMin = m;
      } else {
        startHour = calendar.workStartTime.hour;
        startMin = calendar.workStartTime.minute;
      }
    }
    
    if (calendar?.workEndTime) {
      if (typeof calendar.workEndTime === 'string') {
        const [h, m] = calendar.workEndTime.split(':').map(Number);
        endHour = h;
        endMin = m;
      } else {
        endHour = calendar.workEndTime.hour;
        endMin = calendar.workEndTime.minute;
      }
    }
    
    // Parse lunch times (for visual indicator only)
    let lunchStartMinutes = 12 * 60; // Default 12:00
    let lunchEndMinutes = 13 * 60;   // Default 13:00
    
    if (calendar?.lunchBreakStart) {
      if (typeof calendar.lunchBreakStart === 'string') {
        const [h, m] = calendar.lunchBreakStart.split(':').map(Number);
        lunchStartMinutes = h * 60 + m;
      } else {
        lunchStartMinutes = calendar.lunchBreakStart.hour * 60 + calendar.lunchBreakStart.minute;
      }
    }
    if (calendar?.lunchBreakEnd) {
      if (typeof calendar.lunchBreakEnd === 'string') {
        const [h, m] = calendar.lunchBreakEnd.split(':').map(Number);
        lunchEndMinutes = h * 60 + m;
      } else {
        lunchEndMinutes = calendar.lunchBreakEnd.hour * 60 + calendar.lunchBreakEnd.minute;
      }
    }
    
    // Parse existing interviews
    const existingInterviews = (calendar?.interviews || []).map((interview: any) => {
      const start = new Date(interview.scheduledDate || interview.interviewDateTime);
      const startMins = start.getHours() * 60 + start.getMinutes();
      const duration = interview.durationMinutes || 60;
      return {
        id: interview.id,
        candidateName: interview.candidateName || 'Unknown',
        startMinutes: startMins,
        endMinutes: startMins + duration,
      };
    });
    
    // Generate 15-minute slots
    const slots: TimeSlotInfo[] = [];
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      const slotMinutes = currentHour * 60 + currentMin;
      
      // Check lunch time (visual indicator only)
      const isLunchTime = slotMinutes >= lunchStartMinutes && slotMinutes < lunchEndMinutes;
      
      // Find overlapping interviews for this slot
      const overlappingInterviews = existingInterviews.filter(interview => 
        slotMinutes >= interview.startMinutes && slotMinutes < interview.endMinutes
      );
      
      // Check if this is own interview (for reschedule)
      const isOwnInterview = currentInterviewId 
        ? overlappingInterviews.some(i => i.id === currentInterviewId)
        : false;
      
      slots.push({
        time: timeStr,
        interviewCount: overlappingInterviews.length,
        interviews: overlappingInterviews,
        isOwnInterview,
        isLunchTime,
      });
      
      currentMin += 15;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    
    return slots;
  };

  const loadTimeSlots = async () => {
    if (!selectedDate) return;

    try {
      const calendar = await getDailyCalendar(selectedDate);
      setDailyCalendar(calendar);
      
      const currentInterviewId = interviewRef.current.isReschedule 
        ? interviewRef.current.interview?.id 
        : undefined;
      
      const slots = generateTimeSlots(calendar, currentInterviewId);
      setTimeSlots(slots);
    } catch (error: any) {
      console.error("Failed to load time slots:", error);
      // Generate default slots even if API fails
      const slots = generateTimeSlots(null);
      setTimeSlots(slots);
    }
  };

  const handleDateSelect = (date: Date) => {
    const dateStr = formatDateForAPI(date);
    setSelectedDate(dateStr);
    setForm(prev => ({
      ...prev,
      scheduledDate: dateStr,
      scheduledTime: "",
    }));
  };

  const handleTimeSelect = (time: string) => {
    setForm(prev => ({ ...prev, scheduledTime: time }));
  };

  const handleSchedule = async () => {
    if (!form.scheduledDate || !form.scheduledTime) {
      toast.error("Please select date and time");
      return;
    }

    if (!form.candidateName || !form.positionTitle) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate that the selected time is in the future
    if (isTimeSlotPast(form.scheduledDate, form.scheduledTime)) {
      toast.error("Cannot schedule an interview in the past. Please select a future time.");
      return;
    }

    const { isReschedule: isRescheduleMode, interview: interviewData } = interviewRef.current;
    if (!isRescheduleMode && (!form.jobApplyId || form.jobApplyId === 0)) {
      toast.error("Invalid job application. Please try again.");
      return;
    }

    try {
      setScheduling(true);
      const scheduledDateTime = formatScheduledDateTime(form.scheduledDate, form.scheduledTime);

      if (isRescheduleMode && interviewData) {
        // Check if interview is in a final state (COMPLETED, CANCELLED, NO_SHOW)
        // If so, we need to create a NEW interview (next round) instead of updating
        const finalStatuses = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];
        const isInterviewFinalized = finalStatuses.includes(interviewData.status);
        
        if (isInterviewFinalized) {
          // Create a new interview for the next round
          const nextRound = (interviewData.interviewRound || 1) + 1;
          await scheduleInterview(interviewData.jobApplyId, {
            scheduledDate: scheduledDateTime,
            durationMinutes: form.durationMinutes,
            interviewType: form.interviewType as 'IN_PERSON' | 'VIDEO_CALL' | 'PHONE' | 'ONLINE_ASSESSMENT',
            location: form.location || undefined,
            meetingLink: form.meetingLink || undefined,
            interviewerName: form.interviewerName || undefined,
            interviewerEmail: form.interviewerEmail || undefined,
            interviewerPhone: form.interviewerPhone || undefined,
            preparationNotes: form.notes || undefined,
            interviewRound: nextRound,
          });
          toast.success(`Interview round ${nextRound} scheduled successfully!`);
        } else {
          // Interview is still active (SCHEDULED, CONFIRMED, RESCHEDULED) - update it
          const updateRequest: UpdateInterviewRequest = {
            scheduledDate: scheduledDateTime,
            durationMinutes: form.durationMinutes,
            interviewType: form.interviewType as 'IN_PERSON' | 'VIDEO_CALL' | 'PHONE' | 'ONLINE_ASSESSMENT',
            location: form.location || undefined,
            meetingLink: form.meetingLink || undefined,
            interviewerName: form.interviewerName || undefined,
            interviewerEmail: form.interviewerEmail || undefined,
            interviewerPhone: form.interviewerPhone || undefined,
            preparationNotes: form.notes || undefined,
            updateReason: 'Rescheduled by recruiter',
          };

          await updateInterview(interviewData.id, updateRequest);
          toast.success("Interview rescheduled successfully!");
        }
      } else {
        await scheduleInterview(form.jobApplyId, {
          scheduledDate: scheduledDateTime,
          durationMinutes: form.durationMinutes,
          interviewType: form.interviewType as 'IN_PERSON' | 'VIDEO_CALL' | 'PHONE' | 'ONLINE_ASSESSMENT',
          location: form.location || undefined,
          meetingLink: form.meetingLink || undefined,
          interviewerName: form.interviewerName || undefined,
          interviewerEmail: form.interviewerEmail || undefined,
          interviewerPhone: form.interviewerPhone || undefined,
          preparationNotes: form.notes || undefined,
        });

        toast.success("Interview scheduled successfully!");
      }

      router.push("/recruiter/interviews");
    } catch (error: any) {
      console.error("Failed to schedule interview:", error);
      toast.error(error.message || "Failed to schedule interview");
    } finally {
      setScheduling(false);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newStart);
  };

  function formatTime(time: string | { hour: number; minute: number } | null | undefined): string {
    if (!time) return "";
    
    let hours: number;
    let minutes: number;
    
    if (typeof time === "object" && "hour" in time && "minute" in time) {
      hours = time.hour;
      minutes = time.minute;
    } else if (typeof time === "string") {
      if (time.trim() === "") return "";
      const parts = time.split(":");
      if (parts.length < 2) return time;
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return time;
    } else {
      return String(time);
    }
    
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  function getDayName(date: Date): string {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  function isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  }

  /**
   * Check if a specific time slot is in the past
   * For today's date, compare with current time
   */
  function isTimeSlotPast(dateStr: string, timeStr: string): boolean {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Parse the date string (YYYY-MM-DD format)
    const [year, month, day] = dateStr.split('-').map(Number);
    const slotDate = new Date(year, month - 1, day, hours, minutes);
    
    return slotDate <= now;
  }

  /**
   * Check if all working hours for a given date have passed
   * Used to gray out entire day in calendar
   */
  function isDayFullyPassed(date: Date): boolean {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    // If date is before today, it's fully passed
    if (compareDate < today) {
      return true;
    }
    
    // If date is after today, it's not passed
    if (compareDate > today) {
      return false;
    }
    
    // For today, check if current time is past the last work hour (8 PM / 20:00)
    const lastWorkHour = 20; // Default end hour
    const endOfWorkday = new Date(date);
    endOfWorkday.setHours(lastWorkHour, 0, 0, 0);
    
    return now >= endOfWorkday;
  }

  /**
   * Get slot color based on overlap count
   * 0 = green (available)
   * 1 = blue (one interview)
   * 2+ = purple/violet (overlapping interviews)
   */
  function getSlotColor(slot: TimeSlotInfo, isSelected: boolean): string {
    if (isSelected) {
      return "bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2";
    }
    
    if (slot.isOwnInterview) {
      return "border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 text-amber-700";
    }
    
    if (slot.interviewCount === 0) {
      // Available - green
      return "border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 text-green-800";
    }
    
    if (slot.interviewCount === 1) {
      // One interview - blue
      return "border-blue-200 bg-blue-100 hover:bg-blue-150 hover:border-blue-300 text-blue-800";
    }
    
    // Multiple interviews - purple/violet gradient (blue + red overlap)
    return "border-purple-300 bg-gradient-to-br from-blue-100 via-purple-100 to-red-100 hover:from-blue-150 hover:via-purple-150 hover:to-red-150 text-purple-900";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Compute week dates for the calendar grid
  const weekDates = getWeekDates(currentWeekStart);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {isReschedule ? "Reschedule Interview" : "Schedule Interview"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isReschedule 
                ? "Select a new date and time for this interview"
                : "Choose a date and time to schedule the interview"}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Current Interview Info */}
      {isReschedule && originalInterview && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
              <Clock className="h-5 w-5" />
              Current Interview Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-amber-700 block">Candidate</span>
                <span className="font-medium text-amber-900">{originalInterview.candidateName}</span>
              </div>
              <div>
                <span className="text-amber-700 block">Position</span>
                <span className="font-medium text-amber-900">{originalInterview.positionTitle}</span>
              </div>
              <div>
                <span className="text-amber-700 block">Current Date & Time</span>
                <span className="font-medium text-amber-900">
                  {new Date(originalInterview.scheduledDate || originalInterview.interviewDateTime || '').toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div>
                <span className="text-amber-700 block">Duration</span>
                <span className="font-medium text-amber-900">{originalInterview.durationMinutes} minutes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Date & Time
              </CardTitle>
              <CardDescription>
                Choose any time slot. Overlapping interviews are allowed (multiple interviewers).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Week Navigator */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  {currentWeekStart.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Week Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {weekDates.map((date, index) => {
                  const dateStr = formatDateForAPI(date);
                  const isSelected = selectedDate === dateStr;
                  const disabled = isDayFullyPassed(date);

                  return (
                    <button
                      key={index}
                      onClick={() => !disabled && handleDateSelect(date)}
                      disabled={disabled}
                      className={`
                        p-3 rounded-lg border text-center transition-colors
                        ${disabled 
                          ? "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed" 
                          : isSelected 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "border-border hover:bg-accent"
                        }
                        ${!disabled && isToday(date) ? "ring-2 ring-primary/50" : ""}
                      `}
                    >
                      <div className="text-xs font-medium">{getDayName(date)}</div>
                      <div className="text-lg font-bold">{date.getDate()}</div>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Time Slots</Label>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300 opacity-50"></span>
                        Past
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
                        Available
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></span>
                        🍽️ Lunch
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span>
                        1 Interview
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-gradient-to-br from-blue-100 via-purple-100 to-red-100 border border-purple-300"></span>
                        <Users className="w-3 h-3" />
                        Overlapping
                      </span>
                      {form.scheduledTime && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded bg-primary/20 border border-primary/50 border-dashed"></span>
                          Duration
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {timeSlots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No time slots for this date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((slot) => {
                        const isSelected = form.scheduledTime === slot.time;
                        const isPastSlot = selectedDate ? isTimeSlotPast(selectedDate, slot.time) : false;
                        
                        // Duration preview
                        let isInDurationPreview = false;
                        if (form.scheduledTime && !isSelected) {
                          const [selectedHour, selectedMin] = form.scheduledTime.split(':').map(Number);
                          const [slotHour, slotMin] = slot.time.split(':').map(Number);
                          const selectedMinutes = selectedHour * 60 + selectedMin;
                          const slotMinutes = slotHour * 60 + slotMin;
                          const endMinutes = selectedMinutes + form.durationMinutes;
                          isInDurationPreview = slotMinutes > selectedMinutes && slotMinutes < endMinutes;
                        }
                        
                        // Tooltip content
                        const tooltipContent = isPastSlot
                          ? 'This time has passed'
                          : slot.isLunchTime
                            ? 'Lunch break time'
                            : slot.interviewCount > 0 
                              ? `${slot.interviewCount} interview(s): ${slot.interviews.map(i => i.candidateName).join(', ')}`
                              : 'Available';
                        
                        return (
                          <button
                            key={slot.time}
                            onClick={() => !isPastSlot && handleTimeSelect(slot.time)}
                            disabled={isPastSlot}
                            title={tooltipContent}
                            className={`
                              p-3 rounded-lg border text-sm font-medium transition-all relative
                              ${isPastSlot
                                ? "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
                                : isSelected 
                                  ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2" 
                                  : isInDurationPreview
                                    ? "bg-primary/20 text-primary border-primary/50 border-dashed"
                                    : slot.isLunchTime
                                      ? "border-orange-300 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 text-orange-700"
                                      : getSlotColor(slot, false)
                              }
                            `}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {slot.isLunchTime && <span className="text-sm">🍽️</span>}
                              <span>{formatTime(slot.time)}</span>
                            </div>
                            
                            {/* Selected checkmark */}
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </span>
                            )}
                            
                            {/* Duration preview indicator */}
                            {isInDurationPreview && !isSelected && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary/70 rounded-full flex items-center justify-center">
                                <Clock className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                            
                            {/* Overlap indicator - 2+ people icon (purple) */}
                            {!isSelected && !isInDurationPreview && !slot.isLunchTime && slot.interviewCount >= 2 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                                <Users className="w-3 h-3 text-white" />
                              </span>
                            )}
                            
                            {/* Single interview indicator (blue) */}
                            {!isSelected && !isInDurationPreview && !slot.isLunchTime && slot.interviewCount === 1 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <User className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Summary */}
                  {timeSlots.length > 0 && (
                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span>{timeSlots.filter(s => s.interviewCount === 0).length} available slots</span>
                      <span>{timeSlots.filter(s => s.interviewCount === 1).length} with 1 interview</span>
                      <span>{timeSlots.filter(s => s.interviewCount >= 2).length} overlapping</span>
                    </div>
                  )}
                </div>
              )}

              {/* Daily Calendar Info */}
              {dailyCalendar && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">Selected Day Summary</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Working Hours:</span>
                      <div className="font-medium">
                        {`${formatTime(dailyCalendar.workStartTime || "")} - ${formatTime(dailyCalendar.workEndTime || "")}`}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Scheduled Interviews:</span>
                      <div className="font-medium">{dailyCalendar.totalInterviews}</div>
                    </div>
                    {dailyCalendar.lunchBreakStart && (
                      <div>
                        <span className="text-muted-foreground">Lunch Break:</span>
                        <div className="font-medium">
                          {`${formatTime(dailyCalendar.lunchBreakStart)} - ${formatTime(dailyCalendar.lunchBreakEnd || "")}`}
                        </div>
                      </div>
                    )}
                    {dailyCalendar.hasTimeOff && (
                      <div className="col-span-2 text-amber-600">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        Time-off: {dailyCalendar.timeOffReason}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Interview Details Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Interview Details</CardTitle>
              <CardDescription>Fill in the interview information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Candidate Name */}
              <div>
                <Label htmlFor="candidateName">
                  Candidate Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="candidateName"
                    value={form.candidateName}
                    onChange={(e) => setForm(prev => ({ ...prev, candidateName: e.target.value }))}
                    placeholder="Enter candidate name"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Position Title */}
              <div>
                <Label htmlFor="positionTitle">
                  Position <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="positionTitle"
                    value={form.positionTitle}
                    onChange={(e) => setForm(prev => ({ ...prev, positionTitle: e.target.value }))}
                    placeholder="Enter position title"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Interview Type */}
              <div>
                <Label htmlFor="interviewType">Interview Type</Label>
                <Select
                  value={form.interviewType}
                  onValueChange={(value) => setForm(prev => ({ ...prev, interviewType: value }))}
                >
                  <SelectTrigger id="interviewType" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Select
                  value={form.durationMinutes.toString()}
                  onValueChange={(value) => setForm(prev => ({ ...prev, durationMinutes: parseInt(value) }))}
                >
                  <SelectTrigger id="duration" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((duration) => (
                      <SelectItem key={duration.value} value={duration.value.toString()}>
                        {duration.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location - IN_PERSON only */}
              {form.interviewType === "IN_PERSON" && (
                <div>
                  <Label htmlFor="location">Location</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Enter interview location"
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Meeting Link */}
              {(form.interviewType === "VIDEO_CALL" || form.interviewType === "PHONE" || form.interviewType === "ONLINE_ASSESSMENT") && (
                <div>
                  <Label htmlFor="meetingLink">Meeting Link</Label>
                  <div className="relative mt-1">
                    <Video className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="meetingLink"
                      value={form.meetingLink}
                      onChange={(e) => setForm(prev => ({ ...prev, meetingLink: e.target.value }))}
                      placeholder="https://meet.google.com/..."
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Interviewer Information */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Interviewer Information
                </h4>
                <p className="text-xs text-muted-foreground">
                  This information will be shown to the candidate
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="interviewerName">Interviewer Name</Label>
                    <Input
                      id="interviewerName"
                      value={form.interviewerName}
                      onChange={(e) => setForm(prev => ({ ...prev, interviewerName: e.target.value }))}
                      placeholder="e.g., John Smith"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interviewerEmail">Interviewer Email</Label>
                    <Input
                      id="interviewerEmail"
                      type="email"
                      value={form.interviewerEmail}
                      onChange={(e) => setForm(prev => ({ ...prev, interviewerEmail: e.target.value }))}
                      placeholder="interviewer@company.com"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="md:w-1/2">
                  <Label htmlFor="interviewerPhone">Interviewer Phone</Label>
                  <Input
                    id="interviewerPhone"
                    type="tel"
                    value={form.interviewerPhone}
                    onChange={(e) => setForm(prev => ({ ...prev, interviewerPhone: e.target.value }))}
                    placeholder="e.g., 0901234567"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Schedule Button */}
              <Button
                onClick={handleSchedule}
                disabled={scheduling || !form.scheduledTime}
                className="w-full"
                size="lg"
              >
                {scheduling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isReschedule ? "Updating..." : "Scheduling..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {isReschedule ? "Update Interview" : "Schedule Interview"}
                  </>
                )}
              </Button>

              {form.scheduledDate && form.scheduledTime && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <div className="font-medium text-green-900 mb-1">
                    {isReschedule ? "Ready to Update" : "Ready to Schedule"}
                  </div>
                  <div className="text-green-700">
                    {form.scheduledDate} at {formatTime(form.scheduledTime)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
