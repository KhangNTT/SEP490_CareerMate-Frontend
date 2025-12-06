import api from './api';

/**
 * Check if candidate has access to roadmap recommendation feature
 * Returns an object so the caller can inspect server `code` and `result`.
 */
export async function checkRoadmapRecommendationAccess(): Promise<{
    hasAccess: boolean;
    code?: number | null;
    message?: string;
    result?: any;
}> {
    try {
        const response = await api.get('/api/candidate-entitlement/roadmap-recommendation-checker');
        const data = response.data || {};

        const code = typeof data.code === 'number' ? data.code : null;
        const message = typeof data.message === 'string' ? data.message : '';
        const result = data.result;

        // Allow access when:
        // 1. result === true (boolean) - standard success response
        // 2. result === 'success' (string) - alternative format
        // AND code should be 200 for success
        if ((result === true || result === 'success') && code === 200) {
            return { hasAccess: true, code, message, result };
        }

        // Otherwise deny access (including code 9999 - no entitlement)
        return { hasAccess: false, code, message, result };
    } catch (error: any) {
        console.error('Error checking roadmap recommendation access:', error);
        // On network/error assume no access and no server code
        return { hasAccess: false, code: null, message: 'request_failed' };
    }
}

/**
 * Check if candidate has access to job recommendation feature
 * Returns an object so the caller can inspect server `code` and `result`.
 */
export async function checkJobRecommendationAccess(): Promise<{
    hasAccess: boolean;
    code?: number | null;
    message?: string;
    result?: any;
}> {
    try {
        const response = await api.get('/api/candidate-entitlement/job-recommendation-checker');
        const data = response.data || {};

        const code = typeof data.code === 'number' ? data.code : null;
        const message = typeof data.message === 'string' ? data.message : '';
        const result = data.result;

        // Allow access when result === true and code === 200
        if (result === true && code === 200) {
            return { hasAccess: true, code, message, result };
        }

        // Otherwise deny access
        return { hasAccess: false, code, message, result };
    } catch (error: any) {
        console.error('Error checking job recommendation access:', error);
        return { hasAccess: false, code: null, message: 'request_failed' };
    }
}

/**
 * Check if candidate can create more CV builders
 * Returns access status and potentially the limit/current count
 */
export async function checkCVBuilderAccess(): Promise<{
    hasAccess: boolean;
    code?: number | null;
    message?: string;
    result?: any;
}> {
    try {
        const response = await api.get('/api/candidate-entitlement/cv-builder-checker');
        const data = response.data || {};

        const code = typeof data.code === 'number' ? data.code : null;
        const message = typeof data.message === 'string' ? data.message : '';
        const result = data.result;

        // Allow access when result === true and code === 200
        if (result === true && code === 200) {
            return { hasAccess: true, code, message, result };
        }

        // Otherwise deny access
        return { hasAccess: false, code, message, result };
    } catch (error: any) {
        console.error('Error checking CV builder access:', error);
        return { hasAccess: false, code: null, message: 'request_failed' };
    }
}

/**
 * Check if candidate has access to CV Analyse (ATS) feature
 * Uses Python API endpoint: api/candidate-entitlement/ai-analyzer-checker
 * Returns access status
 */
export async function checkCVAnalyseAccess(): Promise<{
    hasAccess: boolean;
    code?: number | null;
    message?: string;
    result?: any;
}> {
    try {
        const response = await api.get('/api/candidate-entitlement/ai-analyzer-checker');
        const data = response.data || {};

        const code = typeof data.code === 'number' ? data.code : null;
        const message = typeof data.message === 'string' ? data.message : '';
        const result = data.result;

        // Allow access when result === true and code === 200
        if (result === true && code === 200) {
            return { hasAccess: true, code, message, result };
        }

        // Otherwise deny access
        return { hasAccess: false, code, message, result };
    } catch (error: any) {
        console.error('Error checking CV analyse access:', error);
        return { hasAccess: false, code: null, message: 'request_failed' };
    }
}
