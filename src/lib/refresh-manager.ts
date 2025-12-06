/**
 * Unified Token Refresh Manager
 * 
 * This module provides a single point of control for token refresh operations.
 * It prevents duplicate refresh requests and ensures only one refresh happens at a time.
 */

import axios from "axios";
import { useAuthStore } from "@/store/use-auth-store";
import { setCookie } from "@/lib/cookies";

// Single shared refresh promise to prevent concurrent refreshes
let refreshPromise: Promise<string | null> | null = null;

/**
 * Decode JWT token to extract expiration and user info
 */
function decodeJwt(token: string): any | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Extract roles from decoded JWT payload
 */
function extractRoles(decoded: any): string[] {
  if (!decoded) return [];
  if (Array.isArray(decoded.roles)) return decoded.roles;
  if (Array.isArray(decoded.authorities)) return decoded.authorities;
  if (typeof decoded.scope === "string") return decoded.scope.split(" ");
  if (Array.isArray(decoded.scope)) return decoded.scope;
  return [];
}

/**
 * Perform the actual token refresh operation
 */
async function doActualRefresh(): Promise<string | null> {
  try {
    console.debug("🔄 [RefreshManager] Starting token refresh...");

    // Create axios instance for refresh request
    const refreshClient = axios.create({
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
      withCredentials: true, // Important: sends httpOnly cookie
    });

    // Call the refresh endpoint
    const response = await refreshClient.post("/api/auth/token-refresh");

    const result = response.data?.result;
    if (!result?.accessToken || !result?.expiresIn) {
      console.debug("❌ [RefreshManager] Invalid response format");
      return null;
    }

    const accessToken = result.accessToken;
    const expiresIn = result.expiresIn;

    // Decode JWT to get user info
    const decoded = decodeJwt(accessToken);
    const roles = extractRoles(decoded);
    const role = roles[0] || null;

    // Calculate expiration time with small buffer for very short-lived tokens
    const buffer = expiresIn <= 10 ? 500 : 0;
    const expiresAt = Date.now() + (expiresIn * 1000) - buffer;

    // Extract user info from JWT
    const userInfo = decoded ? {
      id: decoded.userId || decoded.sub || null,
      email: decoded.email || null,
      name: decoded.fullname || decoded.name || decoded.email || null,
      username: decoded.username || null,
    } : null;

    // ✅ Extract candidateId directly from JWT (preferred)
    const tokenCandidateId = decoded?.candidateId || null;

    // Update localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("token_expires_at", expiresAt.toString());
      
      // ✅ ALSO store in cookie for SSE EventSource
      setCookie('access_token', accessToken);
      
      console.debug("✅ [unifiedRefresh] Token refreshed and stored in localStorage AND cookies");
    }

    // Update Zustand store with candidateId from JWT
    useAuthStore.setState({
      accessToken,
      tokenExpiresAt: expiresAt,
      isAuthenticated: true,
      role,
      user: userInfo,
      ...(tokenCandidateId ? { candidateId: tokenCandidateId } : {}),
    });

    console.debug(`✅ [RefreshManager] Token refreshed successfully (expires in ${expiresIn}s, candidateId: ${tokenCandidateId})`);

    // Only fetch profile if candidateId not in token (fallback)
    if (!tokenCandidateId) {
      const { fetchCandidateProfile } = useAuthStore.getState();
      fetchCandidateProfile().catch(() => {
        console.debug("⚠️ [RefreshManager] Profile fetch failed (non-critical)");
      });
    }

    return accessToken;
  } catch (error: any) {
    console.debug("❌ [RefreshManager] Refresh failed:", error?.message || "Unknown error");

    // Distinguish between network errors and auth errors
    if (!error.response) {
      // Network error - don't clear auth, just return null
      console.debug("🌐 [RefreshManager] Network error - not clearing auth");
      return null;
    }

    // Auth error (401/403) - refresh token invalid
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.debug("🔐 [RefreshManager] Refresh token invalid - clearing auth");
      // Don't clear auth here - let caller decide
      return null;
    }

    // Other server error
    console.debug(`⚠️ [RefreshManager] Server error (${error.response?.status})`);
    return null;
  }
}

/**
 * Unified refresh function - use this everywhere
 * 
 * This function ensures only one refresh operation happens at a time,
 * preventing race conditions and token rotation issues.
 * 
 * @returns Promise<string | null> - New access token if successful, null otherwise
 */
export async function unifiedRefresh(): Promise<string | null> {
  // If refresh is already in progress, return the existing promise
  if (refreshPromise) {
    console.debug("⏳ [RefreshManager] Refresh already in progress, waiting...");
    return refreshPromise;
  }

  // Start new refresh operation
  refreshPromise = doActualRefresh().finally(() => {
    // Clear the promise when done (success or failure)
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Check if a token is expired or about to expire
 * 
 * @param tokenExpiresAt - Token expiration timestamp in milliseconds
 * @param thresholdMs - Time threshold before expiration (default: 3000ms)
 * @returns boolean - true if token needs refresh
 */
export function isTokenExpired(tokenExpiresAt: number | null, thresholdMs: number = 3000): boolean {
  if (!tokenExpiresAt) return true;
  return (tokenExpiresAt - Date.now()) <= thresholdMs;
}

/**
 * Get the current access token from store or localStorage
 */
export function getAccessToken(): string | null {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) return accessToken;
  
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token");
  }
  
  return null;
}

/**
 * Get the current token expiration time
 */
export function getTokenExpiresAt(): number | null {
  const { tokenExpiresAt } = useAuthStore.getState();
  if (tokenExpiresAt) return tokenExpiresAt;
  
  if (typeof window !== "undefined") {
    const expiresAtStr = localStorage.getItem("token_expires_at");
    return expiresAtStr ? parseInt(expiresAtStr, 10) : null;
  }
  
  return null;
}
