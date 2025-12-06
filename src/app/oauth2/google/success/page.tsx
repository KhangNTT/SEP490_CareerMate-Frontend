"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

/**
 * Google OAuth Success Content
 */
function GoogleOAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your Google sign-in...");

  useEffect(() => {
    const processGoogleAuth = async () => {
      try {
        // Get OAuth parameters
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setMessage("Google authentication failed");
          setTimeout(() => {
            router.push(`/auth/error?error=${error}`);
          }, 2000);
          return;
        }

        if (!code) {
          setStatus("error");
          setMessage("No authorization code received");
          setTimeout(() => {
            router.push("/auth/error?error=MissingCode");
          }, 2000);
          return;
        }

        // In a real app, you'd send the code to your backend here
        // For now, we'll simulate success
        setStatus("success");
        setMessage("Google sign-in successful!");

        // Redirect to the callback URL or home
        const callbackUrl = state || "/";
        setTimeout(() => {
          router.push(callbackUrl);
        }, 2000);

      } catch (error) {
        console.error("Google OAuth error:", error);
        setStatus("error");
        setMessage("An error occurred during authentication");
        setTimeout(() => {
          router.push("/auth/error?error=ProcessingError");
        }, 2000);
      }
    };

    processGoogleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          {status === "processing" && (
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
          )}
          {status === "success" && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
          {status === "processing" && "Signing in with Google"}
          {status === "success" && "Success!"}
          {status === "error" && "Authentication Failed"}
        </h1>

        {/* Message */}
        <div className={`rounded-lg p-4 mb-6 ${
          status === "processing" ? "bg-blue-50 border border-blue-200" :
          status === "success" ? "bg-green-50 border border-green-200" :
          "bg-red-50 border border-red-200"
        }`}>
          <p className={`text-center ${
            status === "processing" ? "text-blue-800" :
            status === "success" ? "text-green-800" :
            "text-red-800"
          }`}>
            {message}
          </p>
        </div>

        {/* Loading Animation */}
        {status === "processing" && (
          <div className="flex justify-center">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Google OAuth Success Page
 * 
 * Handles successful Google OAuth authentication.
 */
export default function GoogleOAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <GoogleOAuthSuccessContent />
    </Suspense>
  );
}
