/**
 * Simple Real-time Notification Bell
 * Connects to SSE and updates badge in real-time
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  redirectUrl?: string;
  metadata?: any;
  eventType?: string;
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch initial unread count on mount
  useEffect(() => {
    const fetchInitialUnreadCount = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      try {
        console.log('🔔 [Bell] Fetching initial unread count...');
        const response = await fetch(`${apiUrl}/api/notifications/unread-count`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('🔔 [Bell] Raw unread count response:', JSON.stringify(data));
          // Handle multiple response formats:
          // { count: N } or { result: N } or { result: { count: N } } or just N
          let count = 0;
          if (typeof data === 'number') {
            count = data;
          } else if (typeof data.result === 'number') {
            count = data.result;
          } else if (data.result?.count !== undefined) {
            count = data.result.count;
          } else if (data.count !== undefined) {
            count = data.count;
          }
          console.log('🔔 [Bell] Parsed unread count:', count);
          setUnreadCount(count);
        } else {
          console.warn('⚠️ [Bell] Failed to fetch unread count:', response.status);
        }
      } catch (error) {
        console.error('❌ [Bell] Error fetching unread count:', error);
      } finally {
        setInitialLoadDone(true);
      }
    };

    fetchInitialUnreadCount();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Fetch recent notifications when opening dropdown
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('access_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Always refresh notifications when dropdown opens
      fetch(`${apiUrl}/api/notifications?page=0&size=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.result?.content) {
            setNotifications(data.result.content);
            // Also sync unread count based on fetched notifications
            const unread = data.result.content.filter((n: Notification) => !n.isRead).length;
            console.log('🔔 [Bell] Synced unread from notifications:', unread);
          }
        })
        .catch(err => console.error('Failed to fetch notifications:', err));
    }
  }, [isOpen]);

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    const token = localStorage.getItem('access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    
    try {
      const response = await fetch(`${apiUrl}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('✅ [Bell] Notification marked as read:', notificationId);
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        
        // Decrease unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('❌ [Bell] Failed to mark as read:', error);
    }
  };

  // Handle notification click - mark as read and navigate
  const handleNotificationClick = async (notification: Notification) => {
    console.log('🖱️ [Bell] Notification clicked:', notification);
    
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // Close dropdown
    setIsOpen(false);
    
    // Try to get redirect URL from notification data
    let redirectUrl = notification.redirectUrl || notification.metadata?.redirectUrl;
    
    // If no redirectUrl, construct one based on notification type and metadata
    if (!redirectUrl) {
      console.log('⚠️ [Bell] No redirectUrl found, attempting to construct from metadata:', notification.metadata);
      console.log('📋 [Bell] EventType:', notification.eventType);
      console.log('📋 [Bell] Title:', notification.title);
      console.log('📋 [Bell] Message:', notification.message);
      
      const eventType = notification.eventType || '';
      const metadata = notification.metadata || {};
      
      console.log('🔍 [Bell] Metadata:', metadata);
      
      // ========== ADMIN NOTIFICATIONS (4 types) ==========
      if (eventType === 'SYSTEM_NOTIFICATION') {
        // New job posting pending approval
        redirectUrl = '/admin/job-management';
        console.log('✅ [Admin] Job pending approval -> /admin/job-management');
      } 
      else if (eventType === 'PROFILE_VERIFICATION') {
        // New recruiter registration
        redirectUrl = '/admin/recruiter-management';
        console.log('✅ [Admin] New recruiter registration -> /admin/recruiter-management');
      }
      else if (eventType === 'PROFILE_UPDATE_REQUEST') {
        // Recruiter profile update request
        redirectUrl = '/admin/recruiter-management';
        console.log('✅ [Admin] Profile update request -> /admin/recruiter-management');
      }
      else if (eventType === 'TEST_ADMIN_NOTIFICATION') {
        // Testing notification
        redirectUrl = '/admin';
        console.log('✅ [Admin] Test notification -> /admin');
      }
      
      // ========== RECRUITER NOTIFICATIONS (8 types) ==========
      else if (eventType === 'JOB_POSTING_APPROVED') {
        // Job approved by admin
        redirectUrl = '/recruiter/recruiter-feature/jobs/active';
        console.log('✅ [Recruiter] Job approved -> /recruiter/recruiter-feature/jobs/active');
      }
      else if (eventType === 'JOB_POSTING_REJECTED') {
        // Job rejected by admin
        redirectUrl = '/recruiter/recruiter-feature/jobs/drafts';
        console.log('✅ [Recruiter] Job rejected -> /recruiter/recruiter-feature/jobs/drafts');
      }
      else if (eventType === 'APPLICATION_RECEIVED') {
        // New candidate application - go to applications list
        redirectUrl = '/recruiter/recruiter-feature/candidates/applications';
        console.log('✅ [Recruiter] Application received -> /recruiter/recruiter-feature/candidates/applications');
      }
      else if (eventType === 'APPLICATION_AUTO_WITHDRAWN' || eventType === 'APPLICATION_WITHDRAWN') {
        // Candidate withdrew or was auto-withdrawn (hired elsewhere)
        redirectUrl = '/recruiter/recruiter-feature/candidates/applications';
        console.log('✅ [Recruiter] Application withdrawn -> /recruiter/recruiter-feature/candidates/applications');
      }
      else if (eventType === 'INTERVIEW_CONFIRMED') {
        // Candidate confirmed attendance
        redirectUrl = '/recruiter/calendar';
        console.log('✅ [Recruiter] Interview confirmed -> /recruiter/calendar');
      }
      else if (eventType === 'INTERVIEW_REMINDER_24_HOUR' || eventType === 'INTERVIEW_REMINDER_2_HOUR') {
        // Interview reminder for recruiter (24h or 2h before)
        redirectUrl = '/recruiter/calendar';
        console.log('✅ [Recruiter] Interview reminder -> /recruiter/calendar');
      }
      else if (eventType === 'INTERVIEW_AUTO_CANCELLED' || eventType === 'INTERVIEW_CANCELLED') {
        // Interview cancelled (auto or manual)
        redirectUrl = '/recruiter/calendar';
        console.log('✅ [Recruiter] Interview cancelled -> /recruiter/calendar');
      }
      else if (eventType === 'PROFILE_UPDATE_APPROVED') {
        // Profile update approved
        redirectUrl = '/recruiter/recruiter-feature/profile';
        console.log('✅ [Recruiter] Profile update approved -> /recruiter/recruiter-feature/profile');
      }
      else if (eventType === 'PROFILE_UPDATE_REJECTED') {
        // Profile update rejected
        redirectUrl = '/recruiter/recruiter-feature/profile';
        console.log('✅ [Recruiter] Profile update rejected -> /recruiter/recruiter-feature/profile');
      }
      else if (eventType === 'ACCOUNT_APPROVED') {
        // Registration approved
        redirectUrl = '/recruiter';
        console.log('✅ [Recruiter] Account approved -> /recruiter');
      }
      else if (eventType === 'ACCOUNT_REJECTED') {
        // Registration rejected
        redirectUrl = '/recruiter-profile-completion';
        console.log('✅ [Recruiter] Account rejected -> /recruiter-profile-completion');
      }
      else if (eventType === 'TEST_RECRUITER_NOTIFICATION') {
        // Testing notification
        redirectUrl = '/recruiter';
        console.log('✅ [Recruiter] Test notification -> /recruiter');
      }
      
      // ========== CANDIDATE NOTIFICATIONS ==========
      else if (eventType === 'APPLICATION_STATUS_CHANGED') {
        // Status updated by recruiter
        redirectUrl = '/candidate/my-jobs';
        console.log('✅ [Candidate] Application status changed -> /candidate/my-jobs');
      }
      else if (eventType === 'AUTO_WITHDRAW' || eventType === 'APPLICATION_AUTO_WITHDRAWN' || eventType === 'APPLICATIONS_AUTO_WITHDRAWN') {
        // Application(s) auto-withdrawn because candidate was hired elsewhere
        redirectUrl = '/candidate/my-jobs';
        console.log('✅ [Candidate] Auto-withdraw notification -> /candidate/my-jobs');
      }
      else if (eventType === 'INTERVIEW_INVITATION' || eventType === 'INTERVIEW_SCHEDULED') {
        // Interview invitation/scheduled
        redirectUrl = '/candidate/interviews';
        console.log('✅ [Candidate] Interview invitation -> /candidate/interviews');
      }
      else if (eventType === 'INTERVIEW_INVITATION_CONFLICT') {
        // Interview invitation with scheduling conflict - candidate has another interview at this time
        redirectUrl = '/candidate/interviews';
        console.log('⚠️ [Candidate] Interview invitation WITH CONFLICT -> /candidate/interviews');
      }
      else if (eventType === 'INTERVIEW_REMINDER' || eventType === 'INTERVIEW_REMINDER_24H' || eventType === 'INTERVIEW_REMINDER_2H' || eventType === 'INTERVIEW_REMINDER_24_HOUR' || eventType === 'INTERVIEW_REMINDER_2_HOUR') {
        // Interview reminder (24h or 2h before)
        redirectUrl = '/candidate/interviews';
        console.log('✅ [Candidate] Interview reminder -> /candidate/interviews');
      }
      else if (eventType === 'INTERVIEW_UPDATE') {
        // Interview details updated
        redirectUrl = '/candidate/interviews';
        console.log('✅ [Candidate] Interview update -> /candidate/interviews');
      }
      else if (eventType === 'INTERVIEW_CANCELLED') {
        // Interview cancelled
        redirectUrl = '/candidate/interviews';
        console.log('✅ [Candidate] Interview cancelled -> /candidate/interviews');
      }
      else if (eventType === 'INTERVIEW_RESCHEDULED' || eventType === 'RESCHEDULE_REQUEST_RESPONDED') {
        // Interview rescheduled or reschedule request responded
        redirectUrl = '/candidate/interviews';
        console.log('✅ [Candidate] Interview rescheduled -> /candidate/interviews');
      }
      else if (eventType === 'INTERVIEW_OUTCOME_PASS' || eventType === 'INTERVIEW_OUTCOME_FAIL' || eventType === 'INTERVIEW_OUTCOME_PENDING') {
        // Interview result notification
        redirectUrl = '/candidate/my-jobs';
        console.log('✅ [Candidate] Interview outcome -> /candidate/my-jobs');
      }
      else if (eventType === 'INTERVIEW_SECOND_ROUND') {
        // Second round interview required
        redirectUrl = '/candidate/interviews';
        console.log('✅ [Candidate] Second round interview -> /candidate/interviews');
      }
      else if (eventType === 'INTERVIEW_NO_SHOW') {
        // Marked as no-show
        redirectUrl = '/candidate/my-jobs';
        console.log('✅ [Candidate] Interview no-show -> /candidate/my-jobs');
      }
      else if (eventType === 'EMPLOYMENT_30_DAY_VERIFICATION' || eventType === 'EMPLOYMENT_90_DAY_VERIFICATION') {
        // Employment verification reminder
        redirectUrl = '/candidate/employments';
        console.log('✅ [Candidate] Employment verification -> /candidate/employments');
      }
      else if (eventType === 'EMPLOYMENT_TERMINATED') {
        // Employment terminated by recruiter
        redirectUrl = '/candidate/employments';
        console.log('✅ [Candidate] Employment terminated -> /candidate/employments');
      }
      else if (eventType === 'REVIEW_ELIGIBLE') {
        // Now eligible to submit review
        const jobApplyId = metadata.jobApplyId;
        if (jobApplyId) {
          redirectUrl = `/candidate/reviews/submit?jobApplyId=${jobApplyId}`;
        } else {
          redirectUrl = '/candidate/employments';
        }
        console.log('✅ [Candidate] Review eligible -> ', redirectUrl);
      }
      else if (eventType === 'DAILY_REMINDER') {
        // Daily tips (9 AM)
        redirectUrl = '/candidate/jobs';
        console.log('✅ [Candidate] Daily reminder -> /candidate/jobs');
      }
      else if (eventType === 'ANNOUNCEMENT') {
        // Weekly insights (Monday 10 AM)
        redirectUrl = '/candidate/jobs';
        console.log('✅ [Candidate] Announcement -> /candidate/jobs');
      }
      else if (eventType === 'APPLICATION_DEADLINE_REMINDER') {
        // Deadline alerts (6 PM)
        const jobPostingId = metadata.jobPostingId;
        if (jobPostingId) {
          redirectUrl = `/candidate/jobs/${jobPostingId}`;
        } else {
          redirectUrl = '/candidate/jobs';
        }
        console.log('✅ [Candidate] Deadline reminder -> ', redirectUrl);
      }
      
      // ========== BROADCAST NOTIFICATION ==========
      else if (eventType === 'BROADCAST_NOTIFICATION') {
        // Admin broadcast - check user role to determine redirect
        // Default to home/dashboard based on typical user
        redirectUrl = '/';
        console.log('✅ [Broadcast] Notification -> /');
      }
      
      // ========== FALLBACK LOGIC ==========
      else {
        // Legacy fallback for notifications without eventType
        console.log('⚠️ [Bell] No eventType, using legacy fallback logic');
        
        const { applicationId, jobPostingId } = metadata;
        
        if (applicationId) {
          redirectUrl = '/candidate/my-jobs';
          console.log('✅ [Fallback] Application notification -> /candidate/my-jobs');
        } else if (jobPostingId) {
          redirectUrl = `/candidate/jobs/${jobPostingId}`;
          console.log('✅ [Fallback] Job notification -> /candidate/jobs/' + jobPostingId);
        } else {
          redirectUrl = '/';
          console.log('⚠️ [Fallback] No metadata, defaulting to home');
        }
      }
    }
    
    // Navigate if we have a URL
    if (redirectUrl) {
      console.log('🔗 [Bell] Navigating to:', redirectUrl);
      router.push(redirectUrl);
    } else {
      console.warn('⚠️ [Bell] No redirect URL available for notification:', notification.id);
    }
  };

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('⚠️ [Bell] No token found, will not connect');
      return;
    }

    console.log('🔌 [Bell] Connecting to notification stream...');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const streamUrl = `${apiUrl}/api/notifications/stream`;
    
    let abortController = new AbortController();
    let isActive = true;

    // Use fetch with streaming since EventSource can't send Authorization header
    const connectStream = async () => {
      try {
        const response = await fetch(streamUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [Bell] Stream connection failed:', response.status, errorText);
          setIsConnected(false);
          return;
        }

        console.log('✅ [Bell] Stream connected');
        setIsConnected(true);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          console.error('❌ [Bell] No reader available');
          return;
        }

        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        while (isActive) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('🔌 [Bell] Stream ended');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') {
              // Empty line means end of event, process it
              if (currentEvent && currentData) {
                try {
                  console.log('📨 [Bell] Received event:', currentEvent, 'data:', currentData);
                  
                  if (currentEvent === 'connected') {
                    console.log('✅ [Bell] Connected event received');
                  } else if (currentEvent === 'unread-count') {
                    const parsed = JSON.parse(currentData);
                    const count = parsed.count;
                    console.log('🔔 [Bell] Badge updated:', count);
                    setUnreadCount(count);
                  } else if (currentEvent === 'notification') {
                    const notification = JSON.parse(currentData);
                    console.log('📬 [Bell] New notification:', notification.title);
                    setNotifications(prev => [notification, ...prev].slice(0, 10));
                  }
                } catch (e) {
                  console.warn('⚠️ [Bell] Failed to parse event:', e, currentData);
                }
                
                // Reset for next event
                currentEvent = '';
                currentData = '';
              }
            } else if (line.startsWith('event:')) {
              currentEvent = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              currentData += line.substring(5).trim();
            } else if (line.startsWith(':')) {
              // Comment, ignore
              continue;
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('❌ [Bell] Stream error:', error.message);
          setIsConnected(false);
        }
      }
    };

    connectStream();

    // Cleanup
    return () => {
      console.log('🔌 [Bell] Disconnecting...');
      isActive = false;
      abortController.abort();
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        
        {/* Unread Badge - Updates in Real-time! */}
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center font-semibold"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-sm text-gray-500">{unreadCount} unread</span>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notif.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-gray-900 ${!notif.isRead ? 'font-semibold' : ''}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-1"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
