"use client";
import { create } from "zustand";
import { setCookie, removeCookie } from "@/lib/cookies";
import axios from "axios";

// ===== Storage keys =====
// CHỈ LƯU những gì CẦN THIẾT TUYỆT ĐỐI để tránh XSS đánh cắp thông tin
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token"; // để tương thích cũ
const TOKEN_EXPIRES_AT_KEY = "token_expires_at";
// KHÔNG LƯU: user_info (email, name), user_role (decode từ JWT khi cần)

// ===== Throttle đơn giản để tránh spam refresh/logout song song =====
class SimpleThrottle {
  private static instances = new Map<string, Promise<any>>();
  static async throttle<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.instances.has(key)) return this.instances.get(key)!;
    const p = fn().finally(() => this.instances.delete(key));
    this.instances.set(key, p);
    return p;
  }
}

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  authenticated: boolean;
  expiresIn: number; // seconds
  tokenType?: string;
}

type DecodedJWT = {
  exp?: number;
  scope?: string | string[];
  roles?: string[];
  authorities?: string[];
  sub?: string;
  userId?: number;  // Numeric user ID from backend
  email?: string;
  name?: string;
  [k: string]: any;
};

function decodeJwt(token: string): DecodedJWT | null {
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

function extractRoles(decoded: DecodedJWT | null): string[] {
  if (!decoded) return [];
  if (Array.isArray(decoded.roles)) return decoded.roles;
  if (Array.isArray(decoded.authorities)) return decoded.authorities;
  if (typeof decoded.scope === "string") return decoded.scope.split(" ");
  if (Array.isArray(decoded.scope)) return decoded.scope;
  return [];
}

function isAdminByRoles(roles: string[]) {
  const adminSet = new Set([
    "ADMIN",
    "ROLE_ADMIN",
    "SUPERADMIN",
    "ROLE_SUPERADMIN",
  ]);
  return roles.some((r) => adminSet.has(r));
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null; // giữ tương thích, không dùng
  isLoading: boolean;
  isAuthenticated: boolean;
  tokenExpiresAt: number | null;
  user: any | null;
  role: string | null;
  candidateId: number | null; // ✅ Add candidateId from profile API

  // Actions
  setLoading: (v: boolean) => void;
  setAuthFromTokens: (p: {
    accessToken: string | null;
    tokenExpiresAt: number | null;
    isAuthenticated: boolean;
    role?: string | null;
    user?: any | null;
  }) => void;
  clearAuth: () => void;
  setCandidateId: (candidateId: number | null) => void; // ✅ Add setter for candidateId
  fetchCandidateProfile: () => Promise<void>; // ✅ Add method to fetch profile

  // API
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; isAdmin: boolean }>;
  refresh: () => Promise<string | null>;
  introspect: (token: string) => Promise<{ valid: boolean; exp: number }>;
  logout: () => Promise<void>;
  getTokenExpiration: (token: string) => number;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
function startRefreshTimer(
  get: () => AuthState,
  refresh: () => Promise<string | null>
) {
  // Clear old timer
  if (refreshTimer) clearTimeout(refreshTimer);
  const { tokenExpiresAt } = get();
  if (!tokenExpiresAt) return;

  const now = Date.now();
  const ttl = tokenExpiresAt - now;

  // Nếu token rất ngắn, đặt buffer lớn hơn một chút
  // Làm mới ~20% trước khi hết hạn, tối thiểu 5s, tối đa 60s trước
  const buffer = Math.max(Math.min(Math.floor(ttl * 0.2), 60000), 5000);
  const delay = Math.max(ttl - buffer, 1000);

  refreshTimer = setTimeout(async () => {
    const ok = await refresh();
    // Nếu refresh thành công, timer sẽ được set lại trong setAuthFromTokens
    if (!ok) {
      // Nếu refresh fail, để UI/guard xử lý bằng isAuthenticated false ở nơi khác
    }
  }, delay);
}

// ===== Helper: đọc localStorage ban đầu (client) =====
function getInitialAuthState() {
  if (typeof window === "undefined") {
    return {
      accessToken: null,
      isAuthenticated: false,
      tokenExpiresAt: null,
      user: null,
      role: null,
    };
  }
  try {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const tokenExpiresAtStr = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);

    if (!accessToken || !tokenExpiresAtStr) {
      return {
        accessToken: null,
        isAuthenticated: false,
        tokenExpiresAt: null,
        user: null,
        role: null,
      };
    }
    const tokenExpiresAt = Number(tokenExpiresAtStr);
    const isAuthenticated = tokenExpiresAt > Date.now();

    if (!isAuthenticated) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
      
      // ✅ ALSO remove from cookie
      removeCookie('access_token');
      
      console.debug("✅ [clearTokens] Tokens cleared from localStorage AND cookies");
      return {
        accessToken: null,
        isAuthenticated: false,
        tokenExpiresAt: null,
        user: null,
        role: null,
      };
    }

    // Decode user info & role từ JWT thay vì lưu localStorage (an toàn hơn)
    let userInfo: any = null;
    let role: string | null = null;

    if (accessToken) {
      const decoded = decodeJwt(accessToken);
      if (decoded) {
        // Extract user info
        // Try to get numeric userId first, fallback to parsing sub
        let numericId: number | null = null;
        
        if (decoded.userId && typeof decoded.userId === 'number') {
          numericId = decoded.userId;
        } else if (decoded.sub) {
          // Try to parse sub as number if it's a numeric string
          const parsed = parseInt(decoded.sub);
          if (!isNaN(parsed)) {
            numericId = parsed;
          }
        }
        
        userInfo = {
          id: numericId,
          email: decoded.email ?? decoded.sub ?? null,
          name: decoded.name ?? decoded.email ?? null,
          username: decoded.username ?? null,
        };

        // Extract role from JWT
        const roles = extractRoles(decoded);
        role = roles[0] ?? null;
      }
    }

    return {
      accessToken,
      isAuthenticated,
      tokenExpiresAt,
      user: userInfo,
      role: role,
    };
  } catch {
    return {
      accessToken: null,
      isAuthenticated: false,
      tokenExpiresAt: null,
      user: null,
      role: null,
    };
  }
}

const initial = getInitialAuthState();

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: initial.accessToken,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: initial.isAuthenticated,
  tokenExpiresAt: initial.tokenExpiresAt,
  user: initial.user,
  role: initial.role,
  candidateId: null, // ✅ Initialize candidateId

  // -------- Actions cơ bản để hook gọi --------
  setLoading: (v) => set({ isLoading: v }),

  setAuthFromTokens: ({
    accessToken,
    tokenExpiresAt,
    isAuthenticated,
    role,
    user,
  }) => {
    // Cập nhật localStorage - CHỈ LƯU token và expiry
    // KHÔNG LƯU role - decode từ JWT khi cần
    if (typeof window !== "undefined") {
      if (accessToken && tokenExpiresAt && isAuthenticated) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(tokenExpiresAt));
        
        // ✅ ALSO store in cookie for SSE EventSource authentication
        setCookie('access_token', accessToken);
        
        console.debug("✅ [setTokens] Tokens stored in localStorage AND cookies");
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
      }
      // KHÔNG lưu role vào localStorage - decode từ JWT
      // KHÔNG lưu user_info vào localStorage - chỉ giữ trong memory
    }

    set((s) => ({
      ...s,
      accessToken: accessToken ?? null,
      tokenExpiresAt: tokenExpiresAt ?? null,
      isAuthenticated: !!isAuthenticated,
      role: role !== undefined ? role : s.role,
      user: user !== undefined ? user : s.user,
    }));

    // Lên lịch refresh tự động nếu hợp lệ
    if (accessToken && tokenExpiresAt && isAuthenticated) {
      startRefreshTimer(get, get().refresh);
    } else if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
      // Xóa legacy keys nếu có
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_info");
    }
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    set({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      role: null,
      user: null,
      candidateId: null, // ✅ Clear candidateId on logout
    });
  },

  // ✅ Set candidateId
  setCandidateId: (candidateId) => {
    set({ candidateId });
  },

  // ✅ Fetch user profile from API to get real candidateId
  fetchCandidateProfile: async () => {
    try {
      const { isAuthenticated } = get();
      
      // Only fetch if user is authenticated
      if (!isAuthenticated) {
        return;
      }
      
      try {
        // Try to fetch candidate profile first
        const { fetchCurrentCandidateProfile } = await import('@/lib/candidate-profile-api');
        const candidateProfile = await fetchCurrentCandidateProfile();
        
        // Update store with candidateId from the API response
        set({ candidateId: candidateProfile.candidateId });
        
      } catch (profileError: any) {
        // If profile doesn't exist (400/404), fallback to /api/users/current
        if (profileError.message === 'PROFILE_NOT_FOUND') {
          const { fetchCurrentUser } = await import('@/lib/candidate-profile-api');
          const userProfile = await fetchCurrentUser();
          
          // Use user.id as candidateId temporarily
          set({ candidateId: userProfile.id });
        } else {
          throw profileError;
        }
      }
      
    } catch (error) {
      // Don't throw - let the app continue even if profile fetch fails
    }
  },

  // -------- API methods --------
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const client = axios.create({
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
        withCredentials: true, // để backend set cookie refresh
      });

      const res = await client.post("/api/auth/login", { email, password });

      const result = res.data?.result as TokenResponse;
      if (!result?.accessToken || !result?.expiresIn) {
        set({ isLoading: false });
        const error = new Error(
          "Invalid login response - missing token or expiry"
        );
        (error as any).response = { status: 500, data: res.data };
        throw error;
      }

      const accessToken = result.accessToken;
      const decoded = decodeJwt(accessToken);
      const roles = extractRoles(decoded);
      const role = roles[0] ?? null;
      const isAdmin = isAdminByRoles(roles);
      const expMs = decoded?.exp
        ? decoded.exp * 1000
        : Date.now() + result.expiresIn * 1000;
      const expiresAt = Math.min(expMs, Date.now() + result.expiresIn * 1000); // an toàn hơn

      const userInfo = {
        id: decoded?.sub ?? null,
        email: decoded?.email ?? email,
        role,
        name: decoded?.name ?? decoded?.email ?? email,
      };

      console.log("🔵 [AUTH STORE] Calling setAuthFromTokens with:", {
        hasToken: !!accessToken,
        tokenLength: accessToken.length,
        name: decoded?.name ?? decoded?.email ?? email,
      });

      // Đẩy vào action chung (tự lưu localStorage + set timer)
      get().setAuthFromTokens({
        accessToken,
        tokenExpiresAt: expiresAt,
        isAuthenticated: !!result.authenticated,
        role,
        user: userInfo,
      });

      // ✅ Fetch user profile to get real userId
      // Fire and forget - don't block login flow
      get().fetchCandidateProfile().catch((err) => {
        // Silent fail
      });

      set({ isLoading: false });
      return { success: true, isAdmin };
    } catch (err: any) {
      set({ isLoading: false }); // ✅ Reset loading state on error
      const msg =
        err?.response?.data?.message || err?.message || "Login failed";
      const error = new Error(msg);
      (error as any).response = err?.response;
      throw error;
    }
  },

  getTokenExpiration: (token: string) => {
    const decoded = decodeJwt(token);
    return decoded?.exp ? decoded.exp * 1000 : 0;
    // fallback 0 = hết hạn/không hợp lệ
  },

  refresh: async () => {
    // 🔄 Use unified refresh manager to prevent refresh storms
    const { unifiedRefresh } = await import("@/lib/refresh-manager");
    return unifiedRefresh();
  },

  // Legacy implementation (kept for reference, no longer used directly)
  _legacyRefresh: async () =>
    SimpleThrottle.throttle("refresh", async () => {
      try {
        const client = axios.create({
          timeout: 10000,
          headers: { "Content-Type": "application/json" },
          withCredentials: true, // lấy refresh cookie
        });
        const res = await client.post("/api/auth/token-refresh");
        const result = res.data?.result as TokenResponse | undefined;
        if (!result?.accessToken || !result?.expiresIn) {
          throw new Error("Invalid response format");
        }

        const accessToken = result.accessToken;
        const decoded = decodeJwt(accessToken);
        const roles = extractRoles(decoded);
        const role = roles[0] ?? null;

        // buffer nhẹ cho token siêu ngắn
        const buffer = result.expiresIn <= 10 ? 500 : 0;
        const expMs =
          (decoded?.exp
            ? decoded.exp * 1000
            : Date.now() + result.expiresIn * 1000) - buffer;

        get().setAuthFromTokens({
          accessToken,
          tokenExpiresAt: expMs,
          isAuthenticated: true,
          role, // cập nhật role nếu backend đổi scope
        });

        return accessToken;
      } catch (err: any) {
        // Network lỗi: đừng xoá ngay, trả null để guard xử lý
        if (!err?.response) return null;

        // 401 / 5xx: clear
        if (err.response?.status === 401 || err.response?.status >= 500) {
          get().clearAuth();
        }
        return null;
      }
    }),

  introspect: async (token: string) => {
    try {
      const client = axios.create({
        timeout: 5000,
        headers: { "Content-Type": "application/json" },
      });
      const res = await client.put("/api/auth/introspect", { token });
      const ok = res.data?.result;
      if (!ok) return { valid: false, exp: 0 };
      return { valid: !!ok.valid, exp: Number(ok.exp ?? 0) };
    } catch (err: any) {
      // Network: fallback dùng exp trong token nếu còn hạn
      const d = decodeJwt(token);
      if (d?.exp && d.exp * 1000 > Date.now()) {
        return { valid: true, exp: d.exp };
      }
      return { valid: false, exp: 0 };
    }
  },

  logout: async () =>
    SimpleThrottle.throttle("logout", async () => {
      try {
        const client = axios.create({
          timeout: 5000,
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        });
        await client.post("/api/auth/logout");
      } catch {
        // ignore
      } finally {
        get().clearAuth();
      }
    }),
}));
