"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * OAuth Debug Page Content
 */
function DebugOAuthContent() {
  const searchParams = useSearchParams();
  const [params, setParams] = useState<Record<string, string>>({});
  const [fragment, setFragment] = useState<Record<string, string>>({});

  useEffect(() => {
    // Capture all query parameters
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    setParams(queryParams);

    // Capture URL fragment (hash) parameters
    // OAuth providers sometimes return tokens in the fragment
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams: Record<string, string> = {};
      const hash = window.location.hash.substring(1); // Remove #
      const parts = hash.split("&");
      
      parts.forEach((part) => {
        const [key, value] = part.split("=");
        if (key && value) {
          hashParams[key] = decodeURIComponent(value);
        }
      });
      
      setFragment(hashParams);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            OAuth Debug Information
          </h1>

          {/* Full URL */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Full URL
            </h2>
            <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
              <code className="text-sm text-gray-700 break-all">
                {typeof window !== "undefined" ? window.location.href : "Loading..."}
              </code>
            </div>
          </section>

          {/* Query Parameters */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Query Parameters ({Object.keys(params).length})
            </h2>
            {Object.keys(params).length > 0 ? (
              <div className="bg-gray-100 p-4 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">
                        Key
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(params).map(([key, value]) => (
                      <tr key={key} className="border-b border-gray-200">
                        <td className="py-2 px-3 font-mono text-sm text-blue-600">
                          {key}
                        </td>
                        <td className="py-2 px-3 font-mono text-sm text-gray-700 break-all">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-100 p-4 rounded-lg text-gray-600">
                No query parameters found
              </div>
            )}
          </section>

          {/* Fragment Parameters (Hash) */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Fragment Parameters ({Object.keys(fragment).length})
            </h2>
            {Object.keys(fragment).length > 0 ? (
              <div className="bg-gray-100 p-4 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">
                        Key
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(fragment).map(([key, value]) => (
                      <tr key={key} className="border-b border-gray-200">
                        <td className="py-2 px-3 font-mono text-sm text-blue-600">
                          {key}
                        </td>
                        <td className="py-2 px-3 font-mono text-sm text-gray-700 break-all">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-100 p-4 rounded-lg text-gray-600">
                No fragment parameters found
              </div>
            )}
          </section>

          {/* Common OAuth Parameters */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Common OAuth Parameters
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-gray-700">Code:</span>
                  <span className="ml-2 text-gray-600 font-mono text-sm">
                    {params.code || fragment.access_token ? "✓ Found" : "✗ Not found"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">State:</span>
                  <span className="ml-2 text-gray-600 font-mono text-sm">
                    {params.state || fragment.state ? "✓ Found" : "✗ Not found"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Error:</span>
                  <span className="ml-2 text-gray-600 font-mono text-sm">
                    {params.error || fragment.error ? "⚠ Error present" : "✓ No error"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Access Token:</span>
                  <span className="ml-2 text-gray-600 font-mono text-sm">
                    {fragment.access_token ? "✓ Found" : "✗ Not found"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Error Details (if any) */}
          {(params.error || fragment.error) && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-red-600 mb-3">
                ⚠️ OAuth Error
              </h2>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-red-800 font-semibold mb-2">
                  Error: {params.error || fragment.error}
                </p>
                {(params.error_description || fragment.error_description) && (
                  <p className="text-red-700 text-sm">
                    Description: {params.error_description || fragment.error_description}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Instructions */}
          <section className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">
              💡 Debug Instructions
            </h3>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li>This page displays all OAuth callback parameters</li>
              <li>Check if <code className="bg-yellow-100 px-1 rounded">code</code> or <code className="bg-yellow-100 px-1 rounded">access_token</code> is present</li>
              <li>Verify the <code className="bg-yellow-100 px-1 rounded">state</code> parameter matches your request</li>
              <li>Look for any error parameters indicating OAuth flow issues</li>
              <li>Fragment parameters (after #) may contain tokens in implicit flow</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * OAuth Debug Page
 * 
 * This page helps debug OAuth callback issues by displaying
 * all query parameters and URL fragments from the OAuth provider.
 */
export default function DebugOAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <DebugOAuthContent />
    </Suspense>
  );
}
