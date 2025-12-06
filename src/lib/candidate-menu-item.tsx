import React from "react";
import { BriefcaseBusiness, FileText, IdCardLanyard, LayoutDashboard, Settings } from "lucide-react";

export type MenuItem = {
  href: string;
  label: string;
  key: string;
  icon: React.ReactNode;
  badge?: string | number;
  enabled?: boolean;
};

// ====================
// Candidate Menu Items
// ====================

const PREFIX = "/candidate";
export const candidateMenuItems: MenuItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    key: "dashboard",
    // icon: (
    //   <svg
    //     className="w-5 h-5"
    //     viewBox="0 0 24 24"
    //     fill="none"
    //     stroke="currentColor"
    //     strokeWidth="2"
    //   >
    //     <rect x="3" y="3" width="7" height="7" />
    //     <rect x="14" y="3" width="7" height="7" />
    //     <rect x="14" y="14" width="7" height="7" />
    //     <rect x="3" y="14" width="7" height="7" />
    //   </svg>
    // ),
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    href: "/cv-management",
    label: "CV Management",
    key: "cv-management",
    // icon: (
    //   <svg
    //     className="w-5 h-5"
    //     viewBox="0 0 24 24"
    //     fill="none"
    //     stroke="currentColor"
    //     strokeWidth="2"
    //   >
    //     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    //     <polyline points="14 2 14 8 20 8" />
    //   </svg>
    // ),
    icon: <FileText className="w-5 h-5" />
  },
  {
    href: "/cm-profile",
    label: "CM Profile",
    key: "cm-profile",
    icon: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/my-jobs",
    label: "Job Activities",
    key: "jobs",
    // icon: (
    //   <svg
    //     className="w-5 h-5"
    //     viewBox="0 0 24 24"
    //     fill="none"
    //     stroke="currentColor"
    //     strokeWidth="2"
    //   >
    //     <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    //     <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    //   </svg>
    // ),
    icon: <BriefcaseBusiness className="w-5 h-5" />,
  },
  {
    href: "/interviews",
    label: "Interviews",
    key: "interviews",
    icon: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/interview-practice",
    label: "AI Interview Practice",
    key: "interview-practice",
    icon: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <circle cx="12" cy="5" r="1" fill="currentColor" />
        <path d="M8 22h8" />
        <path d="M4 8l2-2" />
        <path d="M20 8l-2-2" />
      </svg>
    ),
  },
  {
    href: "/employments",
    label: "My Employment",
    key: "employments",
    // icon: (
    //   <svg
    //     className="w-5 h-5"
    //     viewBox="0 0 24 24"
    //     fill="none"
    //     stroke="currentColor"
    //     strokeWidth="2"
    //   >
    //     <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z" />
    //     <path d="M12 12v4" />
    //     <path d="M10 14h4" />
    //   </svg>
    // ),
    icon: <IdCardLanyard className="w-5 h-5" />,
  },
  // Future Feature
  // {
  //   href: "/job-invitation",
  //   label: "Job Invitation",
  //   key: "job-invitation",
  //   icon: (
  //     <svg
  //       className="w-5 h-5"
  //       viewBox="0 0 24 24"
  //       fill="none"
  //       stroke="currentColor"
  //       strokeWidth="2"
  //     >
  //       <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
  //       <polyline points="22,6 12,13 2,6" />
  //     </svg>
  //   ),
  // },
  {
    href: "/road-map",
    label: "Recommend roadmap",
    key: "roadmap-recommendation",
    icon: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  // {
  //   href: "/email-subscriptions",
  //   label: "Email Subscriptions",
  //   key: "email-subscriptions",
  //   icon: (
  //     <svg
  //       className="w-5 h-5"
  //       viewBox="0 0 24 24"
  //       fill="none"
  //       stroke="currentColor"
  //       strokeWidth="2"
  //     >
  //       <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
  //       <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  //     </svg>
  //   ),
  // },
  // {
  //   href: "/notifications",
  //   label: "Notifications",
  //   key: "notifications",
  //   icon: (
  //     <svg
  //       className="w-5 h-5"
  //       viewBox="0 0 24 24"
  //       fill="none"
  //       stroke="currentColor"
  //       strokeWidth="2"
  //     >
  //       <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
  //       <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  //     </svg>
  //   ),
  // },
  {
    href: "/settings",
    label: "Settings",
    key: "settings",
    icon: <Settings className="w-5 h-5" />,
  },
].map((item) => ({
  ...item,
  href: `${PREFIX}${item.href}`,
}));
