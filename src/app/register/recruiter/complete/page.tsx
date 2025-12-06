"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight, Briefcase } from "lucide-react";

/**
 * Recruiter Registration Complete Content
 */
function RecruiterRegistrationCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to recruiter dashboard or sign-in
          const redirectTo = searchParams.get("redirect") || "/sign-in";
          router.push(redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, searchParams]);

  const handleContinue = () => {
    const redirectTo = searchParams.get("redirect") || "/sign-in";
    router.push(redirectTo);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Registration Complete!
        </h1>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-center mb-3">
            Your recruiter account has been created successfully.
          </p>
          <p className="text-green-700 text-sm text-center">
            You can now sign in and start posting jobs.
          </p>
        </div>

        {/* Next Steps */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            What's next?
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">1.</span>
              <span>Sign in to your recruiter account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">2.</span>
              <span>Complete your company profile</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">3.</span>
              <span>Post your first job opening</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">4.</span>
              <span>Start reviewing candidate applications</span>
            </li>
          </ul>
        </div>

        {/* Countdown */}
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600">
            Redirecting to sign in page in <span className="font-semibold text-purple-600">{countdown}</span> second{countdown !== 1 ? "s" : ""}...
          </p>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          Continue to Sign In
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Loading Animation */}
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Recruiter Registration Complete Page
 * 
 * Shown after a recruiter successfully completes registration.
 */
export default function RecruiterRegistrationCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <RecruiterRegistrationCompleteContent />
    </Suspense>
  );
}
