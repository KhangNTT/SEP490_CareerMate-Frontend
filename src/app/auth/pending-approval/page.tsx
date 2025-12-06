"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, Mail } from "lucide-react";

/**
 * Pending Approval Page
 * 
 * Shown when a user's account is awaiting admin approval.
 */
export default function PendingApprovalPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already approved every 30 seconds
    const checkApprovalStatus = setInterval(() => {
      // In a real app, you'd check the API here
      // For now, we'll just keep showing this page
    }, 30000);

    return () => clearInterval(checkApprovalStatus);
  }, []);

  const handleSignOut = () => {
    // Clear any auth tokens
    router.push("/sign-in");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Account Pending Approval
        </h1>

        {/* Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-gray-700 text-center mb-3">
            Your account has been created successfully and is currently awaiting approval from our team.
          </p>
          <p className="text-gray-600 text-sm text-center">
            You will receive an email notification once your account is approved.
          </p>
        </div>

        {/* Next Steps */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            What happens next?
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Our team will review your account within 24-48 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>You'll receive an email when your account is approved</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Once approved, you can sign in and access all features</span>
            </li>
          </ul>
        </div>

        {/* Email Notice */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Check your email inbox for the approval notification.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Back to Sign In
          </button>
        </div>

        {/* Support */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Need help?{" "}
            <a href="mailto:support@careermate.com" className="text-blue-600 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
