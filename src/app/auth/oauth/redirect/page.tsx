"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * OAuth Redirect Content
 */
function OAuthRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get the redirect destination from query params
    const callbackUrl = searchParams.get("callbackUrl");
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      router.push(`/auth/error?error=${error}`);
      return;
    }

    // If we have a callback URL, redirect there
    if (callbackUrl) {
      router.push(callbackUrl);
      return;
    }

    // If we have an OAuth code, redirect to success page
    if (code) {
      router.push(`/auth/success?code=${code}${state ? `&state=${state}` : ""}`);
      return;
    }

    // Default: redirect to sign-in
    setTimeout(() => {
      router.push("/sign-in");
    }, 2000);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Redirecting...
        </h1>
        <p className="text-gray-600">
          Please wait while we complete your authentication.
        </p>
      </div>
    </div>
  );
}

/**
 * OAuth Redirect Page
 * 
 * Handles OAuth redirects and forwards to the appropriate destination.
 */
export default function OAuthRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <OAuthRedirectContent />
    </Suspense>
  );
}
