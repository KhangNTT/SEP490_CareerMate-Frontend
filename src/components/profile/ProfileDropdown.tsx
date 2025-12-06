"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  Bell,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  CreditCard,
  HelpCircle,
  FileUser,
  BriefcaseBusiness,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { getMyInvoice } from "@/lib/invoice-api";
import { getRecruiterInvoice } from "@/lib/recruiter-invoice-api";
import { PremiumAvatar } from "@/components/ui/premium-avatar";
import { NotificationBell } from "@/components/notifications";

interface ProfileDropdownProps {
  userName?: string;
  userAvatar?: string;
  userEmail?: string;
  role?: string;
}

export function ProfileDropdown({
  userName,
  userAvatar,
  userEmail,
  role = "ROLE_USER",
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { isAuthenticated, accessToken, logout, isLoading } = useAuthStore();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);

  // Normalize role - handle both "RECRUITER" and "ROLE_RECRUITER" formats
  // Must be defined before useEffect
  const normalizedRole =
    role?.toUpperCase().includes("CANDIDATE")
      ? "ROLE_CANDIDATE"
      : role?.toUpperCase().includes("RECRUITER")
        ? "ROLE_RECRUITER"
        : role?.toUpperCase().includes("ADMIN")
          ? "ROLE_ADMIN"
          : "ROLE_USER";

  const isCandidate = normalizedRole === "ROLE_CANDIDATE";
  const isRecruiter = normalizedRole === "ROLE_RECRUITER";

  // Check if user has PREMIUM package (Candidate or Recruiter)
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        if (isCandidate) {
          const invoice = await getMyInvoice();
          setIsPremium(invoice?.packageName === 'PREMIUM');
        } else if (isRecruiter) {
          const invoice = await getRecruiterInvoice();
          // For recruiter: PREMIUM package with Active status
          setIsPremium(invoice?.packageName === 'PREMIUM');
        }
      } catch (error) {
        // User doesn't have any active package
        setIsPremium(false);
      }
    };

    if (isAuthenticated) {
      checkPremiumStatus();
    }
  }, [isAuthenticated, isCandidate, isRecruiter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully!");
      setIsUserMenuOpen(false);
      router.push("/");
    } catch (error) {
      toast.error("Failed to logout");
      console.error("Logout error:", error);
    }
  };

  // Debug log
  console.log("🔍 ProfileDropdown Props:", {
    userName,
    userEmail,
    role,
    normalizedRole,
    isCandidate,
    isRecruiter,
    isPremium,
  });

  return (
    <div className="flex items-center gap-2">
      {/* Dark Mode Toggle Button */}
      {/* <button
        onClick={toggleDarkMode}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button> */}

      {/* Notifications Button - Real implementation */}
      <NotificationBell />

      {/* Profile Dropdown */}
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          onClick={toggleDropdown}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          disabled={isLoading}
        >
          {/* Show skeleton during loading/hydration */}
          {isLoading ? (
            <>
              {/* Avatar Skeleton */}
              <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
              
              {/* Username Skeleton */}
              <div className="h-3 w-20 bg-white/20 rounded animate-pulse hidden sm:block" />
              
              {/* Dropdown Arrow - keep visible but subtle */}
              <ChevronDown className="w-4 h-4 opacity-50" />
            </>
          ) : (
            <>
              {/* Avatar */}
              <div className="relative">
                <PremiumAvatar
                  src={userAvatar}
                  alt={userName || 'User'}
                  size="sm"
                  isPremium={isPremium}
                  showOnline={true}
                />
              </div>

              {/* User Name */}
              <span className="font-medium text-sm hidden sm:block">
                {userName || userEmail || "User"}
              </span>

              {/* Dropdown Arrow */}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""
                  }`}
              />
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <PremiumAvatar
                    src={userAvatar}
                    alt={userName || 'User'}
                    size="md"
                    isPremium={isPremium}
                    showOnline={true}
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{userName || userEmail || "User"}</p>
                  <p className="text-sm text-gray-500">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Candidate Menu */}
              {isCandidate && (
                <>
                  <Link
                    href="/candidate/dashboard"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {/* <User className="w-4 h-4" /> */}
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/candidate/cv-management"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <FileText className="w-4 h-4" />
                    CV Management
                  </Link>
                   <Link
                    href="/candidate/cm-profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </Link>
                  <Link
                    href="/candidate/my-jobs"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <BriefcaseBusiness className="w-4 h-4" />
                    Job Activities
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </>
              )}

              {/* Recruiter Menu */}
              {isRecruiter && (
                <>
                  <Link
                    href="/recruiter/recruiter-feature/profile/account"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </Link>
                  <Link
                    href="/recruiter/recruiter-feature/jobs"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <CreditCard className="w-4 h-4" />
                    Find My CV
                  </Link>
                  <Link
                    href="/recruiter/recruiter-feature/services"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    CV Management
                  </Link>
                  <Link
                    href="/recruiter/recruiter-feature/account/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-1"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
