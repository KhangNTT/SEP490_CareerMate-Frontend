"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";

/**
 * Authentication Error Page Content
 */
function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string>("Unknown authentication error");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    // Get error from query parameters
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const errorMessage = searchParams.get("message");

    if (errorParam) {
      setError(getErrorMessage(errorParam));
    } else if (errorMessage) {
      setError(errorMessage);
    }

    if (errorDescription) {
      setErrorDetails(errorDescription);
    }
  }, [searchParams]);

  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      "Configuration": "Authentication configuration error",
      "AccessDenied": "Access denied. You don't have permission to sign in.",
      "Verification": "Email verification failed",
      "OAuthSignin": "Error starting OAuth sign-in",
      "OAuthCallback": "Error handling OAuth callback",
      "OAuthCreateAccount": "Could not create OAuth account",
      "EmailCreateAccount": "Could not create email account",
      "Callback": "Error in authentication callback",
      "OAuthAccountNotLinked": "This account is already linked to another provider",
      "EmailSignin": "Error sending sign-in email",
      "CredentialsSignin": "Invalid credentials",
      "SessionRequired": "Please sign in to access this page",
      "Default": "An error occurred during authentication",
    };

    return errorMessages[errorCode] || errorMessages["Default"];
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleRetrySignIn = () => {
    router.push("/sign-in");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Authentication Error
        </h1>

        {/* Error Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold mb-2">{error}</p>
          {errorDetails && (
            <p className="text-red-700 text-sm">{errorDetails}</p>
          )}
        </div>

        {/* Error Code (if available) */}
        {searchParams.get("error") && (
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Error Code:{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono">
                {searchParams.get("error")}
              </code>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRetrySignIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            Try Again
          </button>

          <button
            onClick={handleGoHome}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </button>

          <button
            onClick={handleGoBack}
            className="w-full bg-white hover:bg-gray-50 text-gray-600 font-semibold py-3 px-4 rounded-lg border border-gray-300 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            If the problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Authentication Error Page
 * 
 * Displays authentication errors and provides options to retry or go home.
 */
export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
