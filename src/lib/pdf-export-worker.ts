/**
 * PDF Export Worker
 * 
 * Core PDF generation logic extracted from the original export-pdf route.
 * This module handles the actual Puppeteer-based PDF generation without
 * any retry logic - retries are now handled by the job polling system.
 * 
 * Used by the background job processor to generate PDFs asynchronously.
 */

import { ExportCVData } from "@/types/export-job";

// =============================================================================
// Configuration
// =============================================================================

/** Valid template IDs */
const VALID_TEMPLATES = ['classic', 'modern', 'professional', 'vintage', 'minimalist', 'elegant', 'polished'];

/**
 * Get the base URL for the application
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const port = process.env.PORT || 3001;
  return `http://localhost:${port}`;
}

const BASE_URL = getBaseUrl();
const isDev = process.env.NODE_ENV === "development";

// =============================================================================
// Types
// =============================================================================

export interface PDFGenerationParams {
  templateId: string;
  cvData: ExportCVData;
  fileName?: string;
  userPackage?: string;
}

export interface PDFGenerationResult {
  success: true;
  pdfBuffer: Buffer;
  sizeKB: number;
  durationMs: number;
}

export interface PDFGenerationError {
  success: false;
  error: string;
  details?: string;
}

export type PDFGenerationOutput = PDFGenerationResult | PDFGenerationError;

// =============================================================================
// Main Generation Function
// =============================================================================

/**
 * Generate a PDF from CV data using Puppeteer
 * 
 * This function launches a browser, navigates to the print template page,
 * and generates a PDF. It handles both development (puppeteer) and production
 * (@sparticuz/chromium) environments.
 * 
 * @param params - PDF generation parameters
 * @returns PDFGenerationOutput - Either success with buffer or error
 */
export async function generatePDF(params: PDFGenerationParams): Promise<PDFGenerationOutput> {
  const { templateId, cvData, fileName, userPackage } = params;
  const startTime = Date.now();
  let browser = null;

  try {
    // ========================================
    // 1. VALIDATE INPUT
    // ========================================
    
    if (!cvData) {
      return { success: false, error: "CV data is required" };
    }

    if (!templateId) {
      return { success: false, error: "Template ID is required" };
    }

    if (!VALID_TEMPLATES.includes(templateId)) {
      return { 
        success: false, 
        error: `Invalid template ID. Valid options: ${VALID_TEMPLATES.join(', ')}` 
      };
    }

    // Serialize CV data to base64
    const cvDataJson = JSON.stringify(cvData);
    const encodedData = Buffer.from(cvDataJson).toString('base64');

    console.log("========================================");
    console.log("🚀 PDF GENERATION STARTED (Worker)");
    console.log("========================================");
    console.log("🎨 Template:", templateId);
    console.log("📁 File name:", fileName || `cv.pdf`);
    console.log("📊 Data size:", (cvDataJson.length / 1024).toFixed(2), "KB");
    console.log("🔧 Environment:", isDev ? "Development" : "Production");
    console.log("========================================");

    // ========================================
    // 2. LAUNCH BROWSER
    // ========================================
    
    if (isDev) {
      // Local development - Use full puppeteer with bundled Chromium
      const puppeteer = require("puppeteer");
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
          "--font-render-hinting=none",
        ],
        defaultViewport: {
          width: 794,
          height: 1123,
          deviceScaleFactor: 1,
        },
      });
    } else {
      // Production - Use puppeteer-core + @sparticuz/chromium for serverless
      const puppeteerCore = require("puppeteer-core");
      const chromium = (await import("@sparticuz/chromium")).default;
      
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: { 
          width: 794, 
          height: 1123,
          deviceScaleFactor: 1,
        },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    }

    console.log("✅ Browser launched successfully");

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(90000); // 90 seconds for job-based approach

    // ========================================
    // 3. NAVIGATE TO PRINT PAGE
    // ========================================
    
    const packageParam = userPackage ? `&package=${encodeURIComponent(userPackage)}` : '';
    const printUrl = `${BASE_URL}/candidate/cv/print/${templateId}?data=${encodeURIComponent(encodedData)}${packageParam}`;
    
    console.log("🌐 Navigating to print page...");

    await page.goto(printUrl, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    
    console.log("✅ Page loaded successfully");

    // ========================================
    // 4. PREPARE FOR PDF GENERATION
    // ========================================
    
    await page.emulateMediaType("screen");
    
    // Wait for fonts
    try {
      await page.evaluateHandle('document.fonts.ready');
      console.log("✅ All fonts loaded");
    } catch (fontError: any) {
      console.warn("⚠️ Font loading check failed (non-critical):", fontError.message);
    }

    // Small delay for final rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    // ========================================
    // 5. GENERATE PDF
    // ========================================
    
    console.log("📄 Generating PDF...");
    
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    const pdfBuffer = Buffer.from(pdf);
    const sizeKB = pdfBuffer.length / 1024;

    console.log(`✅ PDF generated (${sizeKB.toFixed(2)} KB)`);

    // ========================================
    // 6. CLEANUP & RETURN
    // ========================================
    
    await browser.close();
    console.log("✅ Browser closed");

    const durationMs = Date.now() - startTime;
    console.log("========================================");
    console.log(`✅ PDF GENERATION COMPLETED in ${(durationMs / 1000).toFixed(2)}s`);
    console.log("========================================");

    return {
      success: true,
      pdfBuffer,
      sizeKB,
      durationMs,
    };

  } catch (error: any) {
    console.error("========================================");
    console.error("❌ PDF GENERATION FAILED");
    console.error("========================================");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("========================================");

    // Cleanup browser if still open
    if (browser) {
      try {
        await browser.close();
        console.log("✅ Browser cleaned up after error");
      } catch (cleanupError) {
        console.error("❌ Browser cleanup failed:", cleanupError);
      }
    }

    return {
      success: false,
      error: error.message || "Unknown error during PDF generation",
      details: error.stack,
    };
  }
}

/**
 * Validate template ID
 */
export function isValidTemplate(templateId: string): boolean {
  return VALID_TEMPLATES.includes(templateId);
}

/**
 * Get list of valid templates
 */
export function getValidTemplates(): string[] {
  return [...VALID_TEMPLATES];
}
