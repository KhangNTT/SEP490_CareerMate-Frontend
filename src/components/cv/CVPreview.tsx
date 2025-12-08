"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SAMPLE_CV_DATA, CV_TEMPLATES, CVData } from "@/types/cv";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Globe,
  Link as LinkIcon,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { uploadCVPDF } from "@/lib/firebase-upload";
import { useAuthStore } from "@/store/use-auth-store";
import toast from "react-hot-toast";
import { useFileUrl, resolveFileUrl } from "@/lib/firebase-file";
import { useCVStore } from "@/stores/cvStore";
import api from "@/lib/api";
// Job-based PDF export (replaces retry-based approach)
import { useExportPDFJob } from "@/hooks/useExportPDFJob";
import type { ExportCVData } from "@/types/export-job";
import "./zoom-slider.css";

/**
 * CVPhoto component - handles Firebase Storage paths/URLs for CV photos
 * Includes crossOrigin="anonymous" for CORS support when exporting to PDF
 */
function CVPhoto({ 
  photoUrl, 
  alt = "profile", 
  className 
}: { 
  photoUrl?: string; 
  alt?: string; 
  className?: string;
}) {
  const resolvedUrl = useFileUrl(photoUrl);
  
  if (!photoUrl || !resolvedUrl) return null;
  
  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      crossOrigin="anonymous"
    />
  );
}

const decodeHtmlEntities = (value: string) => {
  if (!value) return "";
  if (typeof window === "undefined" || !window.document) {
    return value;
  }
  const textarea = window.document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const toPrintableText = (value?: string) => {
  if (!value) return "";
  const decoded = decodeHtmlEntities(value)
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2022\u25AA\u25CF]/g, "-");

  return decoded
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D");
};

// Fallback PDF generation using window.print
const handlePrintPDF = () => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups for this site to download PDF");
    return;
  }

  const cvElement = document.querySelector(".cv-container");
  if (!cvElement) {
    alert("CV preview not found");
    printWindow.close();
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>CV</title>
        <style>
          @media print {
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: "Segoe UI", "Arial", "Helvetica", sans-serif; 
              color: #000; 
              font-size: 14px;
              line-height: 1.5;
            }
            .cv-container { width: 100%; background: white !important; }
            * { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important;
              color: inherit !important;
              font-family: "Segoe UI", "Arial", "Helvetica", sans-serif !important;
            }
          }
          body { 
            font-family: "Segoe UI", "Arial", "Helvetica", sans-serif; 
            color: #000; 
            font-size: 14px;
            line-height: 1.5;
          }
          .cv-container { width: 794px; margin: 0 auto; background: white; }
          .text-gray-500 { color: #6B7280 !important; }
          .text-gray-600 { color: #4B5563 !important; }
          .text-gray-700 { color: #374151 !important; }
          .text-gray-800 { color: #1F2937 !important; }
          .text-gray-900 { color: #111827 !important; }
          .bg-white { background-color: #FFFFFF !important; }
          .bg-gray-50 { background-color: #F9FAFB !important; }
          .bg-gray-100 { background-color: #F3F4F6 !important; }
          h1, h2, h3, h4, h5, h6 { font-family: "Segoe UI", "Arial", "Helvetica", sans-serif !important; }
          .text-sm { font-size: 14px !important; }
          .text-xs { font-size: 12px !important; }
          .text-lg { font-size: 18px !important; }
          .text-xl { font-size: 20px !important; }
          .text-2xl { font-size: 24px !important; }
        </style>
      </head>
      <body>
        <div class="cv-container">${cvElement.innerHTML}</div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

// Direct PDF generation without html2canvas
const handleDirectPDF = (cvData: CVData) => {
  try {
    const pdf = new jsPDF("p", "mm", "a4");

    // Add support for Vietnamese fonts
    pdf.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    pdf.setFont("helvetica"); // Fallback to helvetica for basic support

    let yPosition = 20;
    const margin = 20;
    const pageWidth = 210;
    const lineHeight = 8;

    // Title
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    const printableName = toPrintableText(cvData.personalInfo.fullName) || "CV";
    pdf.text(printableName, margin, yPosition);
    yPosition += lineHeight * 2;

    // Position/Title
    if (cvData.personalInfo.position) {
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        toPrintableText(cvData.personalInfo.position),
        margin,
        yPosition
      );
      yPosition += lineHeight * 1.5;
    }

    // Contact Info Header
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Personal Details", margin, yPosition);
    yPosition += lineHeight;

    // Contact Info
    pdf.setFontSize(11);
    pdf.setTextColor(50, 50, 50);
    if (cvData.personalInfo.phone) {
      pdf.text(
        `Phone: ${toPrintableText(cvData.personalInfo.phone)}`,
        margin,
        yPosition
      );
      yPosition += lineHeight * 0.8;
    }
    if (cvData.personalInfo.email) {
      pdf.text(
        `Email: ${toPrintableText(cvData.personalInfo.email)}`,
        margin,
        yPosition
      );
      yPosition += lineHeight * 0.8;
    }
    if (cvData.personalInfo.dob) {
      pdf.text(
        `Date of Birth: ${toPrintableText(cvData.personalInfo.dob)}`,
        margin,
        yPosition
      );
      yPosition += lineHeight * 0.8;
    }
    if (cvData.personalInfo.location) {
      pdf.text(
        `Location: ${toPrintableText(cvData.personalInfo.location)}`,
        margin,
        yPosition
      );
      yPosition += lineHeight * 0.8;
    }
    if (cvData.personalInfo.linkedin) {
      pdf.text(
        `LinkedIn: ${toPrintableText(cvData.personalInfo.linkedin)}`,
        margin,
        yPosition
      );
      yPosition += lineHeight * 0.8;
    }
    yPosition += lineHeight;

    // About Me / Summary
    if (cvData.personalInfo.summary) {
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("About Me", margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(11);
      pdf.setTextColor(50, 50, 50);
      const summaryLines = pdf.splitTextToSize(
        toPrintableText(cvData.personalInfo.summary),
        pageWidth - 2 * margin
      );
      pdf.text(summaryLines, margin, yPosition);
      yPosition += summaryLines.length * lineHeight * 0.8 + lineHeight;
    }

    // Experience
    if (cvData.experience && cvData.experience.length > 0) {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Experience", margin, yPosition);
      yPosition += lineHeight;

      cvData.experience.forEach((exp: CVData['experience'][0], index: number) => {
        if (yPosition > 260) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(
          `${toPrintableText(exp.position)} at ${toPrintableText(exp.company)}`,
          margin,
          yPosition
        );
        yPosition += lineHeight * 0.8;

        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const dateText = toPrintableText(exp.period || "Present");
        pdf.text(dateText, margin, yPosition);
        yPosition += lineHeight * 0.8;

        if (exp.description) {
          pdf.setFontSize(10);
          pdf.setTextColor(70, 70, 70);
          const descLines = pdf.splitTextToSize(
            toPrintableText(exp.description),
            pageWidth - 2 * margin
          );
          pdf.text(descLines, margin, yPosition);
          yPosition += descLines.length * lineHeight * 0.7 + lineHeight * 0.5;
        }

        yPosition += lineHeight * 0.5; // Space between experiences
      });
    }

    // Education
    if (cvData.education && cvData.education.length > 0) {
      if (yPosition > 240) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Education", margin, yPosition);
      yPosition += lineHeight;

      cvData.education.forEach((edu: CVData['education'][0]) => {
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(
          `${toPrintableText(edu.degree || "Bachelor of Computer Science")}`,
          margin,
          yPosition
        );
        yPosition += lineHeight * 0.8;

        pdf.setFontSize(11);
        pdf.setTextColor(70, 70, 70);
        pdf.text(
          `${toPrintableText(
            edu.school || "Hanoi University of Science and Technology"
          )}`,
          margin,
          yPosition
        );
        yPosition += lineHeight * 0.8;

        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const eduDateText = toPrintableText(edu.period || "Present");
        pdf.text(eduDateText, margin, yPosition);
        yPosition += lineHeight * 1.2;
      });
    }

    // Skills
    if (cvData.skills && cvData.skills.length > 0) {
      if (yPosition > 240) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Skills", margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(11);
      pdf.setTextColor(50, 50, 50);
      const skillsText = cvData.skills
        .map((skill: CVData['skills'][0]) => `${skill.category}: ${skill.items.map(item => item.skill).join(', ')}`)
        .join(" | ");
      const skillsLines = pdf.splitTextToSize(
        skillsText,
        pageWidth - 2 * margin
      );
      pdf.text(skillsLines, margin, yPosition);
      yPosition += skillsLines.length * lineHeight * 0.8;
    }

    // Languages
    if (cvData.languages && cvData.languages.length > 0) {
      if (yPosition > 240) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Languages", margin, yPosition);
      yPosition += lineHeight;

      cvData.languages.forEach((lang: CVData['languages'][0]) => {
        pdf.setFontSize(11);
        pdf.setTextColor(50, 50, 50);
        pdf.text(
          `${toPrintableText(lang.language)}: ${toPrintableText(
            lang.level || "Proficient"
          )}`,
          margin,
          yPosition
        );
        yPosition += lineHeight * 0.8;
      });
    }

    // Generate filename
    const fullName = toPrintableText(cvData.personalInfo.fullName) || "CV";
    const cleanName = fullName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `CV_${cleanName}_${
      new Date().toISOString().split("T")[0]
    }.pdf`;

    // Save the PDF
    pdf.save(fileName);

    return true;
  } catch (error) {
    console.error("Error generating direct PDF:", error);
    return false;
  }
};

interface Props {
  templateId?: string;
  zoomLevel?: number;
  cvData?: typeof SAMPLE_CV_DATA;
  onEditClick?: () => void;
  onBackClick?: () => void;
  resumeId?: number; // Resume ID for updating after save
  userPackage?: string; // User's package (FREE, BASIC, PLUS, PREMIUM) - controls watermark
}

export default function CVPreview({
  templateId = "classic",
  zoomLevel = 100,
  cvData = SAMPLE_CV_DATA,
  onEditClick,
  onBackClick,
  resumeId: propResumeId,
  userPackage,
}: Props) {
  const [zoom, setZoom] = useState(zoomLevel);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  
  // Get user from auth store
  const { user, candidateId } = useAuthStore();
  
  // Get resumeId from store if not passed as prop
  const storeResumeId = useCVStore((state) => state.currentEditingResumeId);
  const resumeId = propResumeId ?? (storeResumeId ? Number(storeResumeId) : undefined);

  // 🐛 DEBUG: Log resumeId state for troubleshooting
  useEffect(() => {
    console.log("🔍 [CVPreview] resumeId check:", {
      propResumeId,
      storeResumeId,
      finalResumeId: resumeId,
      isMounted,
      user: user?.email,
    });
  }, [resumeId, propResumeId, storeResumeId, isMounted, user]);

  // Job-based PDF export hook (replaces retry-based approach)
  const { 
    isExporting: isJobExporting, 
    progressMessage, 
    error: exportError,
    startExport,
    reset: resetExport 
  } = useExportPDFJob();

  // Fix hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentTemplate =
    CV_TEMPLATES.find((t) => t.id === templateId) || CV_TEMPLATES[3];

  const handleZoomChange = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(50, Math.min(100, newZoom));
    setZoom(clampedZoom);
  }, []);

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCV = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      // Find the CV container element
      const cvElement = document.querySelector(".cv-container");
      if (!cvElement) {
        alert("CV preview not found. Please try again.");
        setIsDownloading(false);
        return;
      }

      // Create a temporary container with proper styling for PDF
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "794px"; // A4 width in pixels at 96 DPI
      tempContainer.style.minHeight = "1123px"; // A4 height in pixels at 96 DPI
      tempContainer.style.background = "white";
      tempContainer.style.fontFamily =
        '"Segoe UI", "Arial", "Helvetica", sans-serif';
      tempContainer.style.fontSize = "14px";
      tempContainer.style.lineHeight = "1.5";
      tempContainer.style.color = "#000000";
      tempContainer.style.fontWeight = "normal";
      tempContainer.style.fontStyle = "normal";

      // Clone the content instead of using innerHTML
      const clonedElement = cvElement.cloneNode(true) as HTMLElement;
      tempContainer.appendChild(clonedElement);

      document.body.appendChild(tempContainer);

      // ========================================
      // FIX: Wait for all images to load before capturing
      // This ensures avatar/photos appear in the PDF
      // ========================================
      console.log("Waiting for images to load...");
      
      const imgs = Array.from(tempContainer.getElementsByTagName("img"));
      
      // Process images: add crossOrigin and convert Firebase URLs to blob if needed
      await Promise.all(
        imgs.map(async (img) => {
          // Skip if already loaded
          if (img.complete && img.naturalWidth > 0) {
            console.log("Image already loaded:", img.src.substring(0, 50) + "...");
            return;
          }
          
          // Set crossOrigin for CORS support
          img.crossOrigin = "anonymous";
          
          const originalSrc = img.src;
          
          // Try to load normally first
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                console.warn("Image load timeout:", originalSrc.substring(0, 50) + "...");
                resolve(); // Don't reject, just continue
              }, 5000);
              
              img.onload = () => {
                clearTimeout(timeout);
                console.log("Image loaded successfully:", originalSrc.substring(0, 50) + "...");
                resolve();
              };
              
              img.onerror = async () => {
                clearTimeout(timeout);
                console.warn("Image load error, trying blob fallback:", originalSrc.substring(0, 50) + "...");
                
                // Fallback: Fetch image as blob to bypass CORS
                try {
                  const response = await fetch(originalSrc, { mode: 'cors' });
                  if (response.ok) {
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    img.src = blobUrl;
                    
                    // Wait for blob URL to load
                    await new Promise<void>((res) => {
                      img.onload = () => res();
                      img.onerror = () => res(); // Still resolve even on error
                    });
                    
                    console.log("Image loaded via blob fallback");
                  }
                  resolve();
                } catch (fetchError) {
                  console.error("Blob fallback failed:", fetchError);
                  resolve(); // Don't block PDF generation
                }
              };
              
              // Force reload if needed
              if (!img.complete) {
                img.src = originalSrc;
              }
            });
          } catch (error) {
            console.error("Error loading image:", error);
            // Continue anyway
          }
        })
      );
      
      console.log("All images processed, proceeding with capture...");

      // Additional wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log("Capturing canvas...");

      // Remove problematic styles that use oklch colors and apply better formatting
      const elementsWithProblematicStyles = tempContainer.querySelectorAll("*");
      elementsWithProblematicStyles.forEach((element) => {
        const htmlElement = element as HTMLElement;

        // Apply proper font family for Vietnamese support
        htmlElement.style.fontFamily =
          '"Segoe UI", "Arial", "Helvetica", sans-serif';
        htmlElement.style.fontWeight = "normal";
        htmlElement.style.fontStyle = "normal";

        // Apply safe color styles
        if (htmlElement.classList.contains("text-gray-500")) {
          htmlElement.style.color = "#6B7280";
        }
        if (htmlElement.classList.contains("text-gray-600")) {
          htmlElement.style.color = "#4B5563";
        }
        if (htmlElement.classList.contains("text-gray-700")) {
          htmlElement.style.color = "#374151";
        }
        if (htmlElement.classList.contains("text-gray-800")) {
          htmlElement.style.color = "#1F2937";
        }
        if (htmlElement.classList.contains("text-gray-900")) {
          htmlElement.style.color = "#111827";
        }
        if (htmlElement.classList.contains("bg-white")) {
          htmlElement.style.backgroundColor = "#FFFFFF";
        }
        if (htmlElement.classList.contains("bg-gray-50")) {
          htmlElement.style.backgroundColor = "#F9FAFB";
        }
        if (htmlElement.classList.contains("bg-gray-100")) {
          htmlElement.style.backgroundColor = "#F3F4F6";
        }

        // Fix font sizes for better readability
        if (htmlElement.classList.contains("text-sm")) {
          htmlElement.style.fontSize = "14px";
        }
        if (htmlElement.classList.contains("text-xs")) {
          htmlElement.style.fontSize = "12px";
        }
        if (htmlElement.classList.contains("text-lg")) {
          htmlElement.style.fontSize = "18px";
        }
        if (htmlElement.classList.contains("text-xl")) {
          htmlElement.style.fontSize = "20px";
        }
        if (htmlElement.classList.contains("text-2xl")) {
          htmlElement.style.fontSize = "24px";
        }

        // Ensure proper line height
        htmlElement.style.lineHeight = "1.5";
      });

      // Capture the element as canvas with more permissive settings
      tempContainer.querySelectorAll("*").forEach((el) => {
        const elem = el as HTMLElement;
        const color = getComputedStyle(elem).color;
        const bg = getComputedStyle(elem).backgroundColor;

        if (color.includes("oklch")) elem.style.color = "#111827"; // text-gray-900
        if (bg.includes("oklch")) elem.style.backgroundColor = "#ffffff"; // trắng an toàn
      });

      document.querySelectorAll('*').forEach(el => {
  const color = getComputedStyle(el).color;
  if (color.includes('oklch')) {
    (el as HTMLElement).style.color = '#000'; // fallback an toàn
  }
});

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: true,
        imageTimeout: 0,
        removeContainer: true,
        ignoreElements: (element: HTMLElement) => {
          const tag = element.tagName.toLowerCase();
          if (tag === "script" || tag === "style" || tag === "link")
            return true;
          if (element instanceof HTMLImageElement && !element.complete)
            return true;
          return false;
        },
      } as any);

      console.log("Canvas captured, creating PDF...");

      // Remove temporary container
      document.body.removeChild(tempContainer);

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Failed to capture canvas");
      }

      // Create PDF
      const imgData = canvas.toDataURL("image/png", 0.95); // Reduce quality slightly for smaller file size
      const pdf = new jsPDF("p", "mm", "a4");

      // Calculate dimensions to fit A4
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      console.log("Adding images to PDF...");

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with current date and CV owner name
      const fullName = cvData.personalInfo.fullName || "CV";
      const cleanName = fullName.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `CV_${cleanName}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      console.log("Saving PDF...", fileName);

      // Download the PDF
      pdf.save(fileName);

      console.log("PDF saved successfully!");
    } catch (error) {
      console.error("Styled PDF generation failed:", error);

      const fallbackSuccess = handleDirectPDF(cvData);
      if (fallbackSuccess) {
        alert(
          "Could not render the fully designed CV. A simplified PDF fallback has been downloaded instead."
        );
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const genericMessage =
        'Failed to generate PDF. Please try the "Print" or "Simple PDF" option as an alternative.';

      if (errorMessage.includes("oklch")) {
        alert(
          'PDF generation failed due to color compatibility issues. Please try the "Print" button as an alternative.'
        );
      } else {
        alert(`${genericMessage}\n\nDetails: ${errorMessage}`);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Export PDF using Job-based polling approach and save to Firebase
  // This replaces the old retry-based downloadCVWithRetry approach
  const handleExportAndSavePDF = async (userId?: string) => {
    if (isDownloading || isJobExporting) return;

    // Check userId (user must be logged in)
    if (!userId) {
      toast.error("Please log in to save your CV");
      return;
    }

    // ========================================
    // ✅ CRITICAL: Validate resumeId exists
    // ========================================
    if (!resumeId) {
      console.error("❌ Cannot export PDF: resumeId is missing!");
      console.log("Debug info:", {
        propResumeId,
        storeResumeId,
        resumeId,
        cvDataFullName: cvData.personalInfo?.fullName
      });
      
      toast.error(
        "Cannot export CV: Resume ID is missing. Please save your CV first, then try exporting again.",
        { duration: 5000 }
      );
      return;
    }

    // Debug: Check if cvData is valid before export
    console.log("🔍 Export started with cvData:", {
      resumeId,
      fullName: cvData.personalInfo?.fullName,
      email: cvData.personalInfo?.email,
      hasExperience: cvData.experience?.length || 0,
      hasEducation: cvData.education?.length || 0,
      templateId: templateId
    });

    // Validate cvData is not sample data
    if (!cvData.personalInfo?.fullName || cvData.personalInfo.fullName === SAMPLE_CV_DATA.personalInfo.fullName) {
      console.warn("⚠️ cvData might be sample data, attempting to reload from localStorage");
      try {
        const savedData = localStorage.getItem('cvData');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.personalInfo?.fullName && parsed.personalInfo.fullName !== SAMPLE_CV_DATA.personalInfo.fullName) {
            console.log("✅ Found valid data in localStorage, but state not updated yet. Please try again.");
            toast.error("CV data is loading. Please try again.");
            return;
          }
        }
      } catch (e) {
        console.error("Error checking localStorage:", e);
      }
    }

    setIsDownloading(true);

    // Show initial loading toast
    const loadingToast = toast.loading("Starting PDF export...");

    try {
      // Generate filename
      const fullName = cvData.personalInfo.fullName || "CV";
      const cleanName = fullName.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `CV_${cleanName}_${new Date().toISOString().split("T")[0]}`;

      // ========================================
      // Resolve photoUrl to valid Firebase download URL
      // ========================================
      let resolvedPhotoUrl = "";
      if (cvData.personalInfo.photoUrl) {
        try {
          resolvedPhotoUrl = await resolveFileUrl(cvData.personalInfo.photoUrl);
          console.log("✅ Resolved photo URL:", resolvedPhotoUrl.substring(0, 100) + "...");
        } catch (error) {
          console.warn("⚠️ Could not resolve photo URL:", error);
          resolvedPhotoUrl = cvData.personalInfo.photoUrl;
        }
      } else {
        console.warn("⚠️ No photoUrl in cvData.personalInfo");
      }

      // Transform cvData to match print template format
      const printData: ExportCVData = {
        name: cvData.personalInfo.fullName || "",
        title: cvData.personalInfo.position || "",
        email: cvData.personalInfo.email || "",
        phone: cvData.personalInfo.phone || "",
        address: cvData.personalInfo.location || "",
        linkedin: cvData.personalInfo.linkedin || "",
        photoUrl: resolvedPhotoUrl,
        dob: cvData.personalInfo.dob || "",
        gender: cvData.personalInfo.gender || "",
        summary: cvData.personalInfo.summary || "",
        experience: cvData.experience?.map(exp => ({
          position: exp.position || "",
          company: exp.company || "",
          period: exp.period || "",
          description: exp.description || ""
        })) || [],
        education: cvData.education?.map(edu => ({
          degree: edu.degree || "",
          institution: edu.school || "",
          period: edu.period || "",
          description: edu.description || ""
        })) || [],
        skills: cvData.skills?.map(skill => ({
          category: skill.category || "",
          items: (skill.items || []).map((item: any) => 
            typeof item === 'string' ? item : (item.skill || item.name || String(item))
          )
        })) || [],
        softSkills: (cvData.softSkills || []).map((skill: any) =>
          typeof skill === 'string' ? skill : (skill.skill || skill.name || String(skill))
        ),
        languages: cvData.languages?.map(lang => ({
          name: lang.language || "",
          level: lang.level || ""
        })) || [],
        certifications: cvData.certifications?.map(cert => ({
          name: cert.name || "",
          issuer: cert.issuer || "",
          date: cert.date || ""
        })) || [],
        projects: cvData.projects?.map(proj => ({
          name: proj.name || "",
          description: proj.description || "",
          period: proj.period || "",
          url: proj.url || ""
        })) || [],
        // Normalize awards to string array (handle both string[] and object[] formats)
        awards: (cvData.awards || []).map((award: any) =>
          typeof award === 'string' ? award : (award.name || String(award))
        )
      };

      // ========================================
      // 🐛 DEBUG: Log printData to verify structure
      // ========================================
      console.log("📋 printData prepared for export:", {
        hasPhotoUrl: !!printData.photoUrl,
        photoUrlPreview: printData.photoUrl?.substring(0, 100),
        name: printData.name,
        templateId,
        dataSize: JSON.stringify(printData).length
      });

      // Update loading message
      toast.loading("Generating PDF... This may take up to a minute.", { id: loadingToast });

      // ========================================
      // NEW: Use job-based export with polling
      // The job handles PDF generation and Firebase upload on the server
      // ========================================
      console.log("🚀 Starting job-based PDF export with resumeId:", resumeId);
      
      const downloadURL = await startExport({
        resumeId: resumeId, // No fallback - already validated above
        templateId: templateId,
        cvData: printData,
        fileName: fileName,
        userPackage: userPackage,
        userId: userId,
      });

      if (!downloadURL) {
        throw new Error(exportError || "PDF export failed. Please try again.");
      }

      if (!downloadURL.startsWith("http")) {
        throw new Error(`Invalid download URL received: ${downloadURL}`);
      }

      console.log("✅ PDF exported and uploaded successfully");
      console.log("📍 Download URL:", downloadURL.substring(0, 100) + "...");

      // Update resume with Firebase URL if resumeId is available
      if (resumeId) {
        toast.loading("Updating CV information...", { id: loadingToast });
        
        try {
          let currentAboutMe = cvData.personalInfo?.summary || "";
          
          try {
            const currentResumeRes = await api.get(`/api/resume`);
            const resumes = currentResumeRes.data?.result || [];
            const currentResume = resumes.find((r: any) => r.resumeId === resumeId);
            if (currentResume?.aboutMe) {
              currentAboutMe = currentResume.aboutMe;
            }
          } catch (fetchError) {
            console.warn("⚠️ Could not fetch current resume, using cvData summary:", fetchError);
          }

          await api.put(`/api/resume/${resumeId}`, {
            resumeUrl: downloadURL,
            type: "WEB",
            aboutMe: currentAboutMe
          });
          console.log("✅ Resume updated with Firebase URL (aboutMe preserved)");
        } catch (updateError) {
          console.warn("⚠️ Could not update resume URL:", updateError);
        }
      }

      toast.success("CV saved successfully!", { id: loadingToast });

      // ========================================
      // ✅ FIX: Download Firebase file using blob fetch to bypass CORS
      // Firebase URLs need to be fetched as blob first before triggering download
      // ========================================
      console.log("📥 Downloading PDF from Firebase:", downloadURL);
      
      try {
        // Fetch the PDF as blob
        const response = await fetch(downloadURL);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log("✅ PDF blob fetched:", blob.size, "bytes");
        
        // Create object URL from blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Create download link with blob URL
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${fileName}.pdf`;
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        console.log("✅ Download triggered successfully");
        
        // Clean up
        document.body.removeChild(link);
        
        // Revoke object URL after a delay to ensure download starts
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          console.log("✅ Blob URL cleaned up");
        }, 1000);
        
        // Show success message with manual download option as fallback
        toast.success(
          <div>
            <p>CV đã tải xuống thành công!</p>
            <p className="text-xs mt-1">
              Không thấy file?{" "}
              <a 
                href={downloadURL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Click vào đây để mở trực tiếp
              </a>
            </p>
          </div>,
          { duration: 6000 }
        );
        
      } catch (downloadError) {
        console.error("❌ Download trigger failed:", downloadError);
        toast.error(
          <div>
            <p>PDF đã lưu lên cloud nhưng không thể tải xuống tự động.</p>
            <p className="text-xs mt-1">
              <a 
                href={downloadURL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Click vào đây để tải xuống thủ công
              </a>
            </p>
          </div>,
          { duration: 10000 }
        );
      }

      return downloadURL;
    } catch (error) {
      console.error("❌ Error exporting and saving PDF:", error);
      
      // Extract meaningful error message
      let errorMessage = "Could not export CV. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more user-friendly messages for known errors
        if (error.message.includes("chromium") || error.message.includes("Chromium")) {
          errorMessage = "PDF service temporarily unavailable. Please try again in a few minutes.";
        } else if (error.message.includes("PDF export failed")) {
          errorMessage = "PDF generation failed on server. Our team has been notified.";
        } else if (error.message.includes("timeout") || error.message.includes("Timeout")) {
          errorMessage = "Export timed out. Please try again with a simpler CV or fewer images.";
        }
      }
      
      toast.error(errorMessage, { 
        id: loadingToast,
        duration: 6000 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoomChange(zoom + 10);
        } else if (e.key === "-") {
          e.preventDefault();
          handleZoomChange(zoom - 10);
        } else if (e.key === "0") {
          e.preventDefault();
          handleZoomChange(100);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom, handleZoomChange]);

  // Mouse wheel zoom support
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        handleZoomChange(zoom + delta);
      }
    },
    [zoom, handleZoomChange]
  );

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Sticky Header Controls */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#3a4660] to-white dark:from-teal-300 dark:to-blue-400 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          {/* Back Button */}
          <button
            onClick={handleBackClick}
            className="flex items-center space-x-2 px-3 py-2 text-base text-gray-800 hover:text-gray-800 hover:bg-gray-300 rounded-md transition-colors"
            title="Back to previous page"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-bold">Back</span>
          </button>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-4 font-semibold text-base text-gray-600">
              <span>Zoom:</span>

              {/* Zoom Buttons */}
              <div className="flex items-center text-base space-x-2">
                <button
                  onClick={() => handleZoomChange(50)}
                  className={`px-2 py-1 rounded text-xs ${
                    zoom === 50 ? "bg-gray-200" : "hover:bg-gray-100"
                  }`}
                >
                  50%
                </button>
                <button
                  onClick={() => handleZoomChange(75)}
                  className={`px-2 py-1 rounded text-xs ${
                    zoom === 75 ? "bg-gray-200" : "hover:bg-gray-100"
                  }`}
                >
                  75%
                </button>
                <button
                  onClick={() => handleZoomChange(100)}
                  className={`px-2 py-1 rounded text-xs ${
                    zoom === 100
                      ? "bg-gray-100 text-gray-600"
                      : "hover:bg-gray-100"
                  }`}
                >
                  100%
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleZoomChange(zoom - 10)}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={zoom <= 50}
                  title="Zoom out (Ctrl+-)"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>

                <span className="text-base text-[#6B7280]">50%</span>

                {/* Custom Zoom Slider */}
                <div className="relative w-24 h-6 flex items-center">
                  {/* Track - gray */}
                  <div className="w-full h-1 bg-gray-400 rounded-full">
                    {/* Progress - gray 600 */}
                    <div
                      className="h-1 bg-gray-600 rounded-full transition-all duration-100"
                      style={{ width: `${((zoom - 50) / (100 - 50)) * 100}%` }}
                    ></div>
                  </div>

                  {/* Input range*/}
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={zoom}
                    onChange={(e) => handleZoomChange(Number(e.target.value))}
                    onInput={(e) =>
                      handleZoomChange(
                        Number((e.target as HTMLInputElement).value)
                      )
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 slider-input"
                    title="Zoom level"
                    style={{
                      background: "transparent",
                      WebkitAppearance: "none",
                      appearance: "none",
                    }}
                  />

                  {/* Thumb - hình tròn trượt */}
                  <div
                    className="absolute w-4 h-4 bg-white border-2 border-gray-500 rounded-full shadow-sm transition-all duration-100 hover:scale-110 pointer-events-none"
                    style={{
                      left: `calc(${((zoom - 50) / (100 - 50)) * 100}% - 8px)`,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  ></div>
                </div>

                <span className="text-base text-[#6B7280]">100%</span>

                <button
                  onClick={() => handleZoomChange(zoom + 10)}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={zoom >= 100}
                  title="Zoom in (Ctrl++)"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => handleZoomChange(100)}
                  className="flex items-center space-x-2 px-3 py-2 text-base text-gray-800 hover:text-gray-800 hover:bg-gray-400 rounded-md transition-colors"
                  title="Reset zoom (Ctrl+0)"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable CV Preview Content */}
      <div
        className="flex-1 overflow-y-auto p-6 bg-gray-50"
        onWheel={handleWheel}
      >
        <div
          className="mx-auto bg-white shadow-lg cv-container"
          style={{
            width: "210mm",
            minHeight: "297mm",
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.2s ease",
          }}
        >
          {/* Classic Template */}
          {templateId === "classic" && (
            <div className="p-12 bg-white cv-template">
              {/* Header */}
              <div className="text-center border-b-2 border-gray-800 pb-6 mb-8">
                <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">
                  {cvData.personalInfo.fullName}
                </h1>
                <p className="text-lg text-gray-600 mb-4">
                  {cvData.personalInfo.position}
                </p>
                <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
                  <span
                    className="overflow-hidden text-ellipsis max-w-[200px]"
                    title={cvData.personalInfo.email}
                  >
                    {cvData.personalInfo.email}
                  </span>
                  <span>{cvData.personalInfo.phone}</span>
                  <span
                    className="overflow-hidden text-ellipsis max-w-[150px]"
                    title={cvData.personalInfo.location}
                  >
                    {cvData.personalInfo.location}
                  </span>
                  {cvData.personalInfo.dob && (
                    <span>{cvData.personalInfo.dob}</span>
                  )}
                  {cvData.personalInfo.nationality && (
                    <span>{cvData.personalInfo.nationality}</span>
                  )}
                </div>
              </div>

              {/* Career Objective */}
              <div className="mb-8">
                <h2 className="text-xl font-serif font-bold text-gray-800 mb-3 uppercase">
                  Career Objective
                </h2>
                <p className="text-gray-700 leading-relaxed text-justify cv-text-content">
                  {cvData.personalInfo.summary}
                </p>
              </div>

              {/*Work Experience */}
              <div className="mb-8">
                <h2 className="text-xl font-serif font-bold text-gray-800 mb-4 uppercase">
                  Work Experience
                </h2>
                <div className="space-y-6">
                  {cvData.experience.map((exp, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-800">
                            {exp.position}
                          </h3>
                          <p className="text-gray-600 italic">{exp.company}</p>
                        </div>
                        <span className="text-gray-600 text-sm">
                          {exp.period}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2 cv-text-content">
                        {exp.description}
                      </p>
                      {exp.achievements && (
                        <ul className="text-gray-700 ml-4">
                          {exp.achievements.map((achievement, i) => (
                            <li
                              key={i}
                              className="list-disc mb-1 cv-text-content"
                            >
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div className="mb-8">
                <h2 className="text-xl font-serif font-bold text-gray-800 mb-4 uppercase">
                  Education
                </h2>
                <div className="space-y-4">
                  {cvData.education.map((edu, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-800">
                            {edu.degree}
                          </h3>
                          <p className="text-gray-600 italic">{edu.school}</p>
                          {edu.gpa && (
                            <p className="text-gray-600 text-sm">
                              GPA: {edu.gpa}
                            </p>
                          )}
                        </div>
                        <span className="text-gray-600 text-sm">
                          {edu.period}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="mb-8">
                <h2 className="text-xl font-serif font-bold text-gray-800 mb-4 uppercase">
                  Skills
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  {cvData.skills.map((skillGroup, index) => (
                    <div key={index}>
                      <h3 className="font-bold text-gray-800 mb-2">
                        {skillGroup.category}:
                      </h3>
                      <p className="text-gray-700">
                        {skillGroup.items.map(item => item.skill).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="mb-8">
                <h2 className="text-xl font-serif font-bold text-gray-800 mb-4 uppercase">
                  Languages
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {cvData.languages.map((lang, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-800">{lang.language}</span>
                      <span className="text-gray-600">{lang.level}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects */}
              {cvData.projects && cvData.projects.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-serif font-bold text-gray-800 mb-4 uppercase">
                    Projects
                  </h2>
                  <div className="space-y-6">
                    {cvData.projects.map((project, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800">
                              {project.name}
                            </h3>
                            {project.url && (
                              <p
                                className="text-gray-600 italic cv-url-text"
                                title={project.url}
                              >
                                {project.url}
                              </p>
                            )}
                          </div>
                          {project.period && (
                            <span className="text-gray-600 text-sm">
                              {project.period}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mb-2">
                          {project.description}
                        </p>
                        {project.technologies &&
                          project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {project.technologies.map((tech, i) => (
                                <span
                                  key={i}
                                  className="bg-gray-100 px-2 py-1 rounded-sm text-xs text-gray-700"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {cvData.certifications && cvData.certifications.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-serif font-bold text-gray-800 mb-4 uppercase">
                    Certifications
                  </h2>
                  <div className="space-y-4">
                    {cvData.certifications.map((cert, index) => (
                      <div key={index} className="mb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-800">
                              {cert.name}
                            </h3>
                            <p className="text-gray-600 italic">
                              {cert.issuer}
                            </p>
                          </div>
                          <span className="text-gray-600 text-sm">
                            {cert.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Awards */}
              {cvData.awards && cvData.awards.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-serif font-bold text-gray-800 mb-4 uppercase">
                    Awards
                  </h2>
                  <div className="space-y-3">
                    {cvData.awards.map((award, i) => (
                      <div key={i} className="mb-2">
                        <p className="font-semibold text-gray-800">
                          {typeof award === 'string' ? award : award.name}
                        </p>
                        {typeof award === 'object' && award.organization && (
                          <p className="text-gray-600 text-sm">{award.organization}</p>
                        )}
                        {typeof award === 'object' && award.date && (
                          <p className="text-gray-500 text-sm">{award.date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hobbies */}
              {cvData.hobbies && cvData.hobbies.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-serif font-bold text-gray-800 mb-4 uppercase">
                    Hobbies
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {cvData.hobbies.map((hobby, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 px-3 py-1 rounded-lg text-gray-700"
                      >
                        {hobby}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Elegant Template */}
          {templateId === "elegant" && (
            <div className="p-12 bg-white text-gray-800 font-sans leading-relaxed cv-template">
              {/* ===== HEADER ===== */}
              <div className="text-center border-b-2 border-gray-900 pb-6 mb-8">
                <h1 className="text-4xl font-bold tracking-wide text-gray-900 mb-2 uppercase">
                  {cvData.personalInfo.fullName}
                </h1>
                <p className="text-lg text-gray-700 mb-4 font-medium tracking-wide">
                  {cvData.personalInfo.position}
                </p>

                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                  {cvData.personalInfo.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" /> {cvData.personalInfo.phone}
                    </span>
                  )}
                  {cvData.personalInfo.email && (
                    <span
                      className="flex items-center gap-1 max-w-[200px]"
                      title={cvData.personalInfo.email}
                    >
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {cvData.personalInfo.email}
                      </span>
                    </span>
                  )}
                  {cvData.personalInfo.location && (
                    <span
                      className="flex items-center gap-1 max-w-[150px]"
                      title={cvData.personalInfo.location}
                    >
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {cvData.personalInfo.location}
                      </span>
                    </span>
                  )}
                  {cvData.personalInfo.dob && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> {cvData.personalInfo.dob}
                    </span>
                  )}
                  {cvData.personalInfo.linkedin && (
                    <a
                      href={`https://${cvData.personalInfo.linkedin}`}
                      target="_blank"
                      className="flex items-center gap-1 text-blue-700 hover:underline max-w-[150px]"
                      title={cvData.personalInfo.linkedin}
                    >
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        LinkedIn
                      </span>
                    </a>
                  )}
                </div>
              </div>

              {/* ===== ABOUT ME ===== */}
              <div className="mb-8">
                <h2 className="text-lg font-bold tracking-widest text-gray-800 mb-3 border-b border-gray-300 uppercase">
                  About Me
                </h2>
                <p className="text-gray-700 text-justify leading-relaxed cv-text-content">
                  {cvData.personalInfo.summary}
                </p>
              </div>

              {/* ===== WORK EXPERIENCE ===== */}
              <div className="mb-8">
                <h2 className="text-lg font-bold tracking-widest text-gray-800 mb-3 border-b border-gray-300 uppercase">
                  Work Experience
                </h2>
                <div className="space-y-6">
                  {cvData.experience.map((exp, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-base">
                            {exp.position}
                          </h3>
                          <p className="text-gray-600 italic text-sm">
                            {exp.company}
                          </p>
                        </div>
                        <span className="text-gray-600 text-sm">
                          {exp.period}
                        </span>
                      </div>

                      {exp.achievements && (
                        <ul className="list-disc ml-5 text-gray-700 text-sm space-y-1">
                          {exp.achievements.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== EDUCATION ===== */}
              <div className="mb-8">
                <h2 className="text-lg font-bold tracking-widest text-gray-800 mb-3 border-b border-gray-300 uppercase">
                  Education
                </h2>
                <div className="space-y-4">
                  {cvData.education.map((edu, index) => (
                    <div key={index} className="flex justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-base">
                          {edu.degree}
                        </h3>
                        <p className="text-gray-600 italic text-sm">
                          {edu.school}
                        </p>
                        {edu.gpa && (
                          <p className="text-gray-700 text-sm">
                            GPA: {edu.gpa}
                          </p>
                        )}
                      </div>
                      <span className="text-gray-600 text-sm">
                        {edu.period}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== SKILLS ===== */}
              <div className="mb-8">
                <h2 className="text-lg font-bold tracking-widest text-gray-800 mb-3 border-b border-gray-300 uppercase">
                  Skills
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  {cvData.skills.map((s, i) => (
                    <div key={i}>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        {s.category}
                      </h3>
                      <p className="text-gray-700 text-sm">
                        {s.items.map(item => item.skill).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== SOFT SKILLS ===== */}
              {cvData.softSkills && cvData.softSkills.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold tracking-widest text-gray-800 mb-3 border-b border-gray-300 uppercase">
                    Soft Skills
                  </h2>
                  <ul className="list-disc ml-5 text-gray-700 text-sm space-y-1">
                    {cvData.softSkills.map((skill, i) => (
                      <li key={i}>{skill}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ===== AWARDS ===== */}
              {cvData.awards && cvData.awards.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold tracking-widest text-gray-800 mb-3 border-b border-gray-300 uppercase">
                    Awards
                  </h2>
                  <div className="space-y-2">
                    {cvData.awards.map((award, i) => (
                      <div key={i} className="mb-2">
                        <p className="font-semibold text-gray-800 text-sm">
                          {typeof award === 'string' ? award : award.name}
                        </p>
                        {typeof award === 'object' && award.organization && (
                          <p className="text-gray-600 text-xs">{award.organization}</p>
                        )}
                        {typeof award === 'object' && award.date && (
                          <p className="text-gray-500 text-xs">{award.date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== FOREIGN LANGUAGES ===== */}
              {cvData.languages && cvData.languages.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold tracking-widest text-gray-800 mb-3 border-b border-gray-300 uppercase">
                    Foreign Languages
                  </h2>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    {cvData.languages.map((lang, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{lang.language}</span>
                        <span className="text-gray-600 italic">
                          {lang.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Vintage Template */}
          {templateId === "vintage" && (
            <div className="p-8 bg-white flex cv-template">
              {/* Left Column */}
              <div className="w-2/3 pr-8 border-r-2 border-gray-200">
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">
                    {cvData.personalInfo.fullName}
                  </h1>
                  <p className="text-lg uppercase tracking-wider text-gray-600 mb-3">
                    {cvData.personalInfo.position}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed cv-text-content">
                    {cvData.personalInfo.summary}
                  </p>
                </div>

                {/* WORK EXPERIENCE */}
                <div className="mb-6">
                  <h2 className="text-lg uppercase font-bold text-gray-800 mb-3 border-b border-gray-300">
                    WORK EXPERIENCE
                  </h2>
                  <div className="space-y-4">
                    {cvData.experience.map((exp, index) => (
                      <div key={index} className="mb-4">
                        <div className="flex items-center">
                          <div className="w-28 text-gray-600 text-sm">
                            {exp.period}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800">
                              {exp.position}{" "}
                              <span className="font-normal">
                                at {exp.company}
                              </span>
                            </h3>
                          </div>
                        </div>
                        <div className="ml-28">
                          <p className="text-gray-700 text-sm mb-2">
                            {exp.description}
                          </p>
                          {exp.achievements && (
                            <ul className="list-disc ml-5 text-gray-700 text-sm">
                              {exp.achievements.map((achievement, i) => (
                                <li key={i} className="mb-1">
                                  {achievement}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SKILL */}
                <div className="mb-6">
                  <h2 className="text-lg uppercase font-bold text-gray-800 mb-3 border-b border-gray-300">
                    SKILL
                  </h2>
                  {cvData.skills.map((skillGroup, index) => (
                    <div key={index} className="mb-2">
                      <h3 className="font-semibold text-gray-800">
                        {skillGroup.category}
                      </h3>
                      <p className="text-gray-700">
                        {skillGroup.items.map((skillItem, i) => (
                          <span key={skillItem.id} className="mr-1">
                            {skillItem.skill}
                            {i < skillGroup.items.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Soft Skills */}
                {cvData.softSkills && cvData.softSkills.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg uppercase font-bold text-gray-800 mb-3 border-b border-gray-300">
                      Soft Skills
                    </h2>
                    <ul className="list-disc ml-5 text-gray-700 mb-2">
                      {cvData.softSkills.map((skill, index) => (
                        <li key={index} className="mb-1">
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Highlight Projects - using work experience format */}
                {cvData.projects && cvData.projects.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg uppercase font-bold text-gray-800 mb-3 border-b border-gray-300">
                      HIGHLIGHT PROJECTS
                    </h2>
                    <div className="space-y-4">
                      {cvData.projects.map((project, index) => (
                        <div key={index} className="mb-4">
                          <div className="flex items-center">
                            {project.period && (
                              <div className="w-28 text-gray-600 text-sm">
                                {project.period}
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-800">
                                {project.name}
                              </h3>
                            </div>
                          </div>
                          <div className={project.period ? "ml-28" : ""}>
                            <p className="text-gray-700 text-sm mb-2">
                              {project.description}
                            </p>
                            {project.technologies && project.technologies.length > 0 && (
                              <p className="text-gray-600 text-xs">
                                Tech: {project.technologies.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="w-1/3 pl-8">
                {/* Contact info and photo */}
                <div className="mb-8 text-center">
                  <CVPhoto
                    photoUrl={cvData.personalInfo.photoUrl}
                    alt="profile"
                    className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                  />
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      <span>{cvData.personalInfo.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      <span
                        className="overflow-hidden text-ellipsis whitespace-nowrap"
                        title={cvData.personalInfo.email}
                        style={{ maxWidth: "calc(100% - 24px)" }}
                      >
                        {cvData.personalInfo.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      <span>{cvData.personalInfo.dob}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      <span
                        className="overflow-hidden text-ellipsis whitespace-nowrap"
                        title={cvData.personalInfo.location}
                        style={{ maxWidth: "calc(100% - 24px)" }}
                      >
                        {cvData.personalInfo.location}
                      </span>
                    </div>
                    {cvData.personalInfo.linkedin && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <span
                          className="overflow-hidden text-ellipsis whitespace-nowrap"
                          title={cvData.personalInfo.linkedin}
                          style={{ maxWidth: "calc(100% - 24px)" }}
                        >
                          {cvData.personalInfo.linkedin}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* EDUCATION */}
                <div className="mb-6">
                  <h2 className="text-lg uppercase font-bold text-gray-800 mb-3 border-b border-gray-300">
                    EDUCATION
                  </h2>
                  <div className="space-y-4">
                    {cvData.education.map((edu, index) => (
                      <div key={index} className="mb-3">
                        <h3 className="font-bold text-gray-800">
                          {edu.school}
                        </h3>
                        <p className="text-gray-700 text-sm">{edu.degree}</p>
                        <div className="flex justify-between text-gray-600 text-sm">
                          <span>{edu.period}</span>
                          {edu.gpa && <span>GPA {edu.gpa}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CERTIFICATE */}
                {cvData.certifications && cvData.certifications.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg uppercase font-bold text-gray-800 mb-3 border-b border-gray-300">
                      CERTIFICATE
                    </h2>
                    <div className="space-y-2">
                      {cvData.certifications.map((cert, index) => (
                        <div key={index} className="mb-2">
                          <p className="font-bold text-gray-800">
                            {cert.name}
                          </p>
                          <p className="text-gray-600 text-sm">
                            {cert.issuer}
                          </p>
                          <p className="text-gray-600 text-sm">{cert.date}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AWARD */}
                {cvData.awards && cvData.awards.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg uppercase font-bold text-gray-800 mb-3 border-b border-gray-300">
                      AWARD
                    </h2>
                    <div className="space-y-2">
                      {cvData.awards.map((award, index) => (
                        <div key={index} className="mb-2">
                          <p className="font-bold text-gray-800">
                            {typeof award === 'string' ? award : award.name}
                          </p>
                          {typeof award === 'object' && award.organization && (
                            <p className="text-gray-600 text-sm">{award.organization}</p>
                          )}
                          {typeof award === 'object' && award.date && (
                            <p className="text-gray-600 text-sm">{award.date}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FOREIGN LANGUAGE */}
                {cvData.languages && cvData.languages.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg uppercase font-bold text-gray-800 mb-3 border-b border-gray-300">
                      FOREIGN LANGUAGE
                    </h2>
                    <div className="space-y-2">
                      {cvData.languages.map((lang, index) => (
                        <div
                          key={index}
                          className="flex justify-between mb-1 text-gray-700"
                        >
                          <span>{lang.language}</span>
                          <span className="text-gray-600">({lang.level})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Polished Template */}
          {templateId === "polished" && (
            <div className="bg-white cv-template">
              {/* Header - Dark Gray */}
              <div className="bg-[#333333] text-white p-8 flex">
                {/* Left side - Photo */}
                <div className="mr-6">
                  {cvData.personalInfo.photoUrl ? (
                    <CVPhoto
                      photoUrl={cvData.personalInfo.photoUrl}
                      alt="Profile"
                      className="w-20 h-20 object-cover rounded"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-600 rounded flex items-center justify-center">
                      <span className="text-2xl">
                        {cvData.personalInfo.fullName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right side - Name, Title, Contact */}
                <div className="flex-1">
                  <div>
                    <h1 className="text-2xl font-bold">
                      {cvData.personalInfo.fullName}
                    </h1>
                    <p className="text-gray-300 text-lg uppercase tracking-wide mb-4">
                      {cvData.personalInfo.position}
                    </p>

                    <div className="grid grid-cols-2 gap-y-1 text-sm">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span>{cvData.personalInfo.phone}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span>{cvData.personalInfo.dob || "10/10/1995"}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span
                          className="overflow-hidden text-ellipsis whitespace-nowrap"
                          title={cvData.personalInfo.email}
                          style={{ maxWidth: "calc(100% - 24px)" }}
                        >
                          {cvData.personalInfo.email}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span
                          className="overflow-hidden text-ellipsis whitespace-nowrap"
                          title={cvData.personalInfo.location}
                          style={{ maxWidth: "calc(100% - 24px)" }}
                        >
                          {cvData.personalInfo.location}
                        </span>
                      </div>
                      {cvData.personalInfo.linkedin && (
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span
                            className="overflow-hidden text-ellipsis whitespace-nowrap"
                            title={cvData.personalInfo.linkedin}
                            style={{ maxWidth: "calc(100% - 24px)" }}
                          >
                            {cvData.personalInfo.linkedin}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="p-8">
                {/* About Me */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-3">
                    About Me
                  </h2>
                  <p className="text-gray-600 leading-relaxed cv-text-content">
                    {cvData.personalInfo.summary}
                  </p>
                </div>

                {/* Education */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-3">
                    Education
                  </h2>

                  {/* University entries */}
                  {cvData.education.map((edu, index) => (
                    <div key={index} className="mb-4">
                      <div className="flex">
                        <div className="w-40 text-gray-500 text-sm">
                          {edu.period}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">
                            {edu.school}
                          </h3>
                          <p className="text-gray-600">{edu.degree}</p>
                          {edu.gpa && (
                            <p className="text-gray-500 text-sm">
                              GPA: {edu.gpa}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Work Experience */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-3">
                    Work Experience
                  </h2>

                  {/* Job entries */}
                  {cvData.experience.map((exp, index) => (
                    <div key={index} className="mb-6">
                      <div className="flex mb-1">
                        <div className="w-40 text-gray-500 text-sm">
                          {exp.period}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <h3 className="font-bold text-gray-800 mr-2">
                              {exp.position}
                            </h3>
                            <span className="text-gray-600">|</span>
                            <span className="ml-2 text-gray-600">
                              {exp.company}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bullet points */}
                      <div className="pl-40">
                        <ul className="list-disc pl-5 text-gray-600 text-sm">
                          {exp.achievements ? (
                            exp.achievements.map((achievement, i) => (
                              <li key={i} className="mb-1">
                                {achievement}
                              </li>
                            ))
                          ) : (
                            <>
                              <li className="mb-1">{exp.description}</li>
                              {index === 0 && (
                                <>
                                  <li className="mb-1">
                                    Architected and developed scalable backend
                                    services using Java and Spring Boot.
                                  </li>
                                  <li className="mb-1">
                                    Collaborated with cybersecurity experts to
                                    ensure compliance with industry standards.
                                  </li>
                                </>
                              )}
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Skill Section */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-3">
                    Skill
                  </h2>

                  {/* Excellent Skills */}
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Excellent</h3>
                    <div className="flex flex-wrap gap-2">
                      {cvData.skills[0]?.items.slice(0, 4).map((skillItem) => (
                        <div
                          key={skillItem.id}
                          className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm"
                        >
                          {skillItem.skill}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Intermediate Skills */}
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Intermediate</h3>
                    <div className="flex flex-wrap gap-2">
                      {cvData.skills[0]?.items.slice(4, 8).map((skillItem) => (
                        <div
                          key={skillItem.id}
                          className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm"
                        >
                          {skillItem.skill}
                        </div>
                      )) ||
                        cvData.skills[1]?.items.map((skillItem) => (
                          <div
                            key={skillItem.id}
                            className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm"
                          >
                            {skillItem.skill}
                          </div>
                        ))}
                      <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm">
                        HTML
                      </div>
                      <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm">
                        CSS
                      </div>
                      <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm">
                        JavaScript
                      </div>
                      <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm">
                        Django
                      </div>
                    </div>
                  </div>

                  {/* Beginner Skills */}
                  <div>
                    <h3 className="font-semibold mb-2">Beginner</h3>
                    <div className="flex flex-wrap gap-2">
                      {cvData.skills[2]?.items.map((skillItem) => (
                        <div
                          key={skillItem.id}
                          className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm"
                        >
                          {skillItem.skill}
                        </div>
                      )) || (
                        <>
                          <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm">
                            MySQL
                          </div>
                          <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm">
                            MongoDB
                          </div>
                          <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm">
                            UI/UX
                          </div>
                          <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-sm text-sm">
                            Ruby
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* PROJECT Section */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-3">
                    PROJECT
                  </h2>

                  {/* Show projects from CV data or use fallback */}
                  {cvData.projects && cvData.projects.length > 0 ? (
                    cvData.projects.map((project, index) => (
                      <div key={index} className="mb-6">
                        <div className="flex mb-1">
                          <div className="w-40 text-gray-500 text-sm">
                            {project.period || "01/2023 - 03/2023"}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-bold text-gray-800 mr-2">
                                {project.name}
                              </h3>
                              {project.url && (
                                <a href={project.url} className="text-blue-600">
                                  <Globe className="w-4 h-4 inline" />
                                </a>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">
                              {project.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Fallback project 1 */}
                      <div className="mb-6">
                        <div className="flex mb-1">
                          <div className="w-40 text-gray-500 text-sm">
                            06/2022 - 05/2023
                          </div>
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-bold text-gray-800 mr-2">
                                Secure Authentication System
                              </h3>
                              <Globe className="w-4 h-4 text-gray-400 ml-1" />
                            </div>
                            <p className="text-gray-600 text-sm">
                              Led the development of a robust and secure
                              authentication system with advanced encryption
                              techniques to safeguard user data.
                            </p>
                            <div className="mt-1">
                              <p className="font-semibold text-gray-700 text-sm">
                                Responsibilities:
                              </p>
                              <ul className="list-disc pl-5 text-gray-600 text-sm">
                                <li>Designed system architecture</li>
                                <li>
                                  Developed backend services, collaborated with
                                  cybersecurity experts
                                </li>
                                <li>
                                  Tech stack: Java, Spring Boot, Cryptography
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fallback project 2 */}
                      <div className="mb-6">
                        <div className="flex mb-1">
                          <div className="w-40 text-gray-500 text-sm">
                            10/2022 - 05/2023
                          </div>
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-bold text-gray-800 mr-2">
                                Content Management System
                              </h3>
                              <Globe className="w-4 h-4 text-gray-400 ml-1" />
                            </div>
                            <p className="text-gray-600 text-sm">
                              Develop a custom content management system using
                              Python, Django, and PostgreSQL.
                            </p>
                            <div className="mt-1">
                              <p className="font-semibold text-gray-700 text-sm">
                                Key features:
                              </p>
                              <ul className="list-disc pl-5 text-gray-600 text-sm">
                                <li>
                                  Design a flexible and user-friendly admin
                                  interface for website content
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Languages Section */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-3">
                    Languages
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {cvData.languages && cvData.languages.length > 0 ? (
                      cvData.languages.map((lang, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-gray-800">{lang.language}</span>
                          <span className="text-gray-600">{lang.level}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-800">English</span>
                          <span className="text-gray-600">Professional</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-800">French</span>
                          <span className="text-gray-600">Intermediate</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-800">Spanish</span>
                          <span className="text-gray-600">Basic</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Certifications Section */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-3">
                    Certifications
                  </h2>
                  <div className="space-y-3">
                    {cvData.certifications &&
                    cvData.certifications.length > 0 ? (
                      cvData.certifications.map((cert, index) => (
                        <div key={index} className="flex">
                          <div className="w-40 text-gray-500 text-sm">
                            {cert.date}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800">
                              {cert.name}
                            </h3>
                            {cert.issuer && (
                              <p className="text-gray-600 text-sm">
                                {cert.issuer}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex">
                          <div className="w-40 text-gray-500 text-sm">2023</div>
                          <div>
                            <h3 className="font-bold text-gray-800">
                              AWS Certified Solutions Architect
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Amazon Web Services
                            </p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-40 text-gray-500 text-sm">2022</div>
                          <div>
                            <h3 className="font-bold text-gray-800">
                              Professional Scrum Master I
                            </h3>
                            <p className="text-gray-600 text-sm">Scrum.org</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modern Template */}
          {templateId === "modern" && (
            <div className="flex h-full cv-template">
              {/* Left Sidebar - Dark Blue */}
              <div className="bg-[#102c54] text-white w-1/4 p-8">
                {/* Name and Title */}
                <div className="mb-10">
                  <h1 className="text-3xl font-bold mb-1">
                    {cvData.personalInfo.fullName}
                  </h1>
                  <p className="text-lg text-gray-300">
                    {cvData.personalInfo.position}
                  </p>
                </div>

                {/* Contact Info */}
                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    <span className="text-sm">{cvData.personalInfo.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    <span
                      className="text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                      title={cvData.personalInfo.email}
                      style={{ maxWidth: "calc(100% - 32px)" }}
                    >
                      {cvData.personalInfo.email}
                    </span>
                  </div>
                  {cvData.personalInfo.dob && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      <span className="text-sm">{cvData.personalInfo.dob}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    <span
                      className="text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                      title={cvData.personalInfo.location}
                      style={{ maxWidth: "calc(100% - 32px)" }}
                    >
                      {cvData.personalInfo.location}
                    </span>
                  </div>
                  {cvData.personalInfo.linkedin && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      <span
                        className="text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                        title={cvData.personalInfo.linkedin}
                        style={{ maxWidth: "calc(100% - 32px)" }}
                      >
                        {cvData.personalInfo.linkedin}
                      </span>
                    </div>
                  )}
                </div>

                {/* Education Section */}
                <div className="mb-10">
                  <h2 className="text-xl font-bold uppercase mb-4 border-b border-gray-400 pb-1">
                    EDUCATION
                  </h2>
                  {cvData.education.map((edu, index) => (
                    <div key={index} className="mb-4">
                      <h3 className="font-semibold text-gray-300">
                        {edu.school}
                      </h3>
                      <p className="text-sm text-gray-400">{edu.degree}</p>
                      <p className="text-xs text-gray-500">{edu.period}</p>
                      {edu.gpa && (
                        <p className="text-xs text-gray-400">GPA: {edu.gpa}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Skills Section */}
                <div className="mb-10">
                  <h2 className="text-xl font-bold uppercase mb-4 border-b border-gray-400 pb-1">
                    SKILL
                  </h2>

                  <div className="space-y-4">
                    {/* Skill levels */}
                    <div>
                      <p className="text-gray-300 mb-2 font-semibold">
                        Excellent
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {cvData.skills[0]?.items.slice(0, 3).map((skillItem) => (
                          <span
                            key={skillItem.id}
                            className="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded"
                          >
                            {skillItem.skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-300 mb-2 font-semibold">
                        Intermediate
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {cvData.skills[1]?.items
                          ?.slice(0, 4)
                          .map((skillItem) => (
                            <span
                              key={skillItem.id}
                              className="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded"
                            >
                              {skillItem.skill}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-300 mb-2 font-semibold">
                        Beginner
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {cvData.skills[2]?.items
                          ?.slice(0, 3)
                          .map((skillItem) => (
                            <span
                              key={skillItem.id}
                              className="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded"
                            >
                              {skillItem.skill}
                            </span>
                          )) ||
                          cvData.skills[0]?.items
                            .slice(3, 5)
                            .map((skillItem) => (
                              <span
                                key={skillItem.id}
                                className="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded"
                              >
                                {skillItem.skill}
                              </span>
                            ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificate Section */}
                <div>
                  <h2 className="text-xl font-bold uppercase mb-4 border-b border-gray-400 pb-1">
                    CERTIFICATE
                  </h2>
                  {cvData.certifications &&
                    cvData.certifications.map((cert, index) => (
                      <div key={index} className="mb-4">
                        <h3 className="font-semibold text-gray-300">
                          {cert.name}
                        </h3>
                        <p className="text-sm text-gray-400">{cert.issuer}</p>
                        <p className="text-xs text-gray-500">{cert.date}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Content Area */}
              <div className="bg-white w-3/4 p-8">
                {/* Profile Photo + Summary */}
                <div className="flex items-start mb-10">
                  <CVPhoto
                    photoUrl={cvData.personalInfo.photoUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover mr-6"
                  />
                  <div>
                    <p className="text-gray-600 text-sm leading-relaxed cv-text-content">
                      {cvData.personalInfo.summary}
                    </p>
                  </div>
                </div>

                {/* WORK EXPERIENCE */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-[#102c54] uppercase mb-5 border-b border-gray-200 pb-1">
                    WORK EXPERIENCE
                  </h2>

                  <div className="space-y-6">
                    {cvData.experience.map((exp, index) => (
                      <div key={index} className="mb-6">
                        <div className="flex items-start">
                          <div className="mr-4 text-gray-500 text-sm min-w-[80px]">
                            {exp.period}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-bold text-gray-800">
                                {exp.position}
                              </h3>
                              <span className="mx-2 text-gray-400">|</span>
                              <span className="text-gray-600">
                                {exp.company}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mt-1">
                              {exp.description}
                            </p>
                            {exp.achievements &&
                              exp.achievements.length > 0 && (
                                <ul className="list-disc pl-5 mt-2 text-sm text-gray-600">
                                  {exp.achievements.map((achievement, i) => (
                                    <li key={i}>{achievement}</li>
                                  ))}
                                </ul>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PERSONAL PROJECT */}
                <div>
                  <h2 className="text-xl font-bold text-[#102c54] uppercase mb-5 border-b border-gray-200 pb-1">
                    PERSONAL PROJECT
                  </h2>

                  {cvData.projects &&
                    cvData.projects.map((project, index) => (
                      <div key={index} className="mb-6">
                        <div className="flex items-start">
                          <div className="mr-4 text-gray-500 text-sm min-w-[80px]">
                            {project.period || ""}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-bold text-gray-800">
                                {project.name}
                              </h3>
                              {project.url && (
                                <a
                                  href={project.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-600"
                                >
                                  <Globe className="inline w-4 h-4" />
                                </a>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm mt-1">
                              {project.description}
                            </p>
                            {project.technologies &&
                              project.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {project.technologies.map((tech, i) => (
                                    <span
                                      key={i}
                                      className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded"
                                    >
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Minimalist Template */}
          {templateId === "minimalist" && (
            <div className="bg-white font-sans text-gray-800 cv-template">
              {/* HEADER */}
              <div className="bg-gray-100 flex justify-between items-center px-12 py-8 rounded-t-xl">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {cvData.personalInfo.fullName}
                  </h1>
                  <p className="text-sm tracking-[0.3em] font-medium text-gray-600 uppercase">
                    {cvData.personalInfo.position}
                  </p>
                </div>
                <CVPhoto
                  photoUrl={cvData.personalInfo.photoUrl}
                  alt="Profile"
                  className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md"
                />
              </div>

              {/* Divider line */}
              <div className="h-1 bg-gray-900 mx-auto w-11/12 rounded my-2"></div>

              {/* MAIN CONTENT */}
              <div className="grid grid-cols-3 gap-10 px-12 py-8">
                {/* LEFT COLUMN */}
                <div className="col-span-1 space-y-8 border-r border-gray-300 pr-8">
                  {/* Personal Details */}
                  <div>
                    <h2 className="text-red-600 text-lg font-bold mb-3 uppercase tracking-wide">
                      Personal Details
                    </h2>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>📞 {cvData.personalInfo.phone}</p>
                      <p
                        className="overflow-hidden text-ellipsis whitespace-nowrap"
                        title={cvData.personalInfo.email}
                      >
                        📧 {cvData.personalInfo.email}
                      </p>
                      <p>🎂 {cvData.personalInfo.dob}</p>
                      <p
                        className="overflow-hidden text-ellipsis whitespace-nowrap"
                        title={cvData.personalInfo.location}
                      >
                        📍 {cvData.personalInfo.location}
                      </p>
                      {cvData.personalInfo.linkedin && (
                        <p
                          className="overflow-hidden text-ellipsis whitespace-nowrap"
                          title={cvData.personalInfo.linkedin}
                        >
                          🔗 {cvData.personalInfo.linkedin}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* About Me */}
                  <div>
                    <h2 className="text-red-600 text-lg font-bold mb-3 uppercase tracking-wide">
                      About Me
                    </h2>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {cvData.personalInfo.summary}
                    </p>
                  </div>

                  {/* Education */}
                  <div>
                    <h2 className="text-red-600 text-lg font-bold mb-3 uppercase tracking-wide">
                      Education
                    </h2>
                    <div className="space-y-3">
                      {cvData.education.map((edu, i) => (
                        <div key={i}>
                          <p className="text-sm font-semibold">{edu.school}</p>
                          <p className="text-sm text-gray-700">{edu.degree}</p>
                          <p className="text-xs text-gray-500">{edu.period}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <h2 className="text-red-600 text-lg font-bold mb-3 uppercase tracking-wide">
                      Skill
                    </h2>
                    <div className="space-y-2 text-sm">
                      {cvData.skills.map((group, i) => (
                        <div key={i}>
                          <p className="font-semibold text-gray-800">
                            {group.category}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {group.items.map((skillItem) => (
                              <span
                                key={skillItem.id}
                                className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                              >
                                {skillItem.skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="col-span-2 space-y-10 pl-4">
                  {/* Work Experience */}
                  <div>
                    <h2 className="text-red-600 text-lg font-bold mb-3 uppercase tracking-wide">
                      Work Experience
                    </h2>
                    <div className="space-y-5">
                      {cvData.experience.map((exp, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-gray-800">
                                {exp.position}
                              </p>
                              <p className="text-sm italic text-gray-600">
                                {exp.company}
                              </p>
                            </div>
                            <p className="text-sm text-gray-500">
                              {exp.period}
                            </p>
                          </div>
                          {exp.achievements && (
                            <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                              {exp.achievements.map((a, j) => (
                                <li key={j}>{a}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Personal Projects */}
                  {cvData.projects && cvData.projects.length > 0 && (
                    <div>
                      <h2 className="text-red-600 text-lg font-bold mb-3 uppercase tracking-wide">
                        Personal Project
                      </h2>
                      <div className="space-y-4">
                        {cvData.projects.map((p, i) => (
                          <div key={i}>
                            <div className="flex justify-between items-start">
                              <p className="font-semibold text-gray-800">
                                {p.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {p.period}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {p.description}
                            </p>
                            {p.url && (
                              <p
                                className="text-xs text-blue-600 mt-1 cv-url-text"
                                title={`Project URL: ${p.url}`}
                              >
                                Project URL: {p.url}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {cvData.certifications &&
                    cvData.certifications.length > 0 && (
                      <div>
                        <h2 className="text-red-600 text-lg font-bold mb-3 uppercase tracking-wide">
                          Certificate
                        </h2>
                        <div className="space-y-3 text-sm">
                          {cvData.certifications.map((cert, i) => (
                            <div key={i}>
                              <div className="flex justify-between items-start">
                                <p className="font-semibold text-gray-800">
                                  {cert.name}
                                </p>
                                <p className="text-gray-500 text-sm">
                                  {cert.date}
                                </p>
                              </div>
                              <p className="text-gray-700">{cert.issuer}</p>
                              {cert.url && (
                                <p className="text-xs text-blue-600">
                                  Certificate URL: {cert.url}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* FOOTER */}
              <div className="text-center text-xs text-gray-400 mt-6 pb-4">
                Page 1/2 — © {new Date().getFullYear()} CV Builder
              </div>
            </div>
          )}

          {/* Professional Template */}
          {templateId === "professional" && (
            <div className="bg-[#f8f8f8] text-gray-800 font-sans leading-relaxed cv-template">
              {/* HEADER */}
              <div className="relative bg-white rounded-t-lg shadow-md p-8 border-l-[8px] border-[#8b1e3f]">
                {/* Decorative corner ribbons */}
                <div className="absolute top-0 left-0 w-0 h-0 border-t-[40px] border-t-[#8b1e3f] border-r-[40px] border-r-transparent rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-[#8b1e3f] border-l-[40px] border-l-transparent rounded-tr-lg"></div>

                {/* Name and Role */}
                <h1 className="text-3xl font-bold text-[#8b1e3f] mb-1">
                  {cvData.personalInfo.fullName}
                </h1>
                <p className="text-lg font-medium text-gray-700 mb-4">
                  {cvData.personalInfo.position}
                </p>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 mb-4">
                  <span className="flex items-center gap-1">
                    📞 {cvData.personalInfo.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    📧 {cvData.personalInfo.email}
                  </span>
                  <span className="flex items-center gap-1">
                    🎂 {cvData.personalInfo.dob}
                  </span>
                  <span className="flex items-center gap-1">
                    📍 {cvData.personalInfo.location}
                  </span>
                  {cvData.personalInfo.linkedin && (
                    <span className="flex items-center gap-1">
                      🔗 {cvData.personalInfo.linkedin}
                    </span>
                  )}
                </div>

                {/* Summary */}
                <p className="text-gray-700 text-sm max-w-4xl leading-relaxed">
                  {cvData.personalInfo.summary}
                </p>
              </div>

              {/* BODY */}
              <div className="bg-white p-8 mt-6 shadow rounded-b-lg">
                {/* EDUCATION */}
                <section className="mb-8">
                  <h2 className="text-lg font-bold text-[#8b1e3f] uppercase mb-3 flex items-center">
                    <span className="w-3 h-3 bg-[#8b1e3f] rounded-full mr-2"></span>
                    Education
                  </h2>
                  <div className="border-t border-gray-300 pt-4 space-y-4">
                    {cvData.education.map((edu, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-gray-600">{edu.period}</p>
                          <div className="text-right">
                            <p className="font-bold text-gray-800">
                              {edu.school}
                            </p>
                            <p className="text-sm text-gray-600">
                              {edu.degree}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* WORK EXPERIENCE */}
                <section className="mb-8">
                  <h2 className="text-lg font-bold text-[#8b1e3f] uppercase mb-3 flex items-center">
                    <span className="w-3 h-3 bg-[#8b1e3f] rounded-full mr-2"></span>
                    Work Experience
                  </h2>
                  <div className="border-t border-gray-300 pt-4 space-y-6">
                    {cvData.experience.map((exp, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm text-gray-600">{exp.period}</p>
                          <div className="text-right">
                            <p className="font-bold text-gray-800">
                              {exp.position}
                            </p>
                            <p className="text-sm text-gray-600">
                              {exp.company}
                            </p>
                          </div>
                        </div>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                          {exp.achievements?.map((a, j) => (
                            <li key={j}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                {/* SKILL */}
                <section className="mb-8">
                  <h2 className="text-lg font-bold text-[#8b1e3f] uppercase mb-3 flex items-center">
                    <span className="w-3 h-3 bg-[#8b1e3f] rounded-full mr-2"></span>
                    Skill
                  </h2>
                  <div className="border-t border-gray-300 pt-4 space-y-4 text-sm">
                    {cvData.skills.map((group, i) => (
                      <div key={i}>
                        <p className="font-semibold text-gray-800 mb-2">
                          {group.category}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((skillItem) => (
                            <span
                              key={skillItem.id}
                              className="border border-gray-300 px-3 py-1 rounded text-gray-700"
                            >
                              {skillItem.skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* CERTIFICATE */}
                {cvData.certifications && cvData.certifications.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold text-[#8b1e3f] uppercase mb-3 flex items-center">
                      <span className="w-3 h-3 bg-[#8b1e3f] rounded-full mr-2"></span>
                      Certificate
                    </h2>
                    <div className="border-t border-gray-300 pt-4 space-y-4 text-sm">
                      {cvData.certifications.map((cert, i) => (
                        <div key={i}>
                          <p className="font-semibold text-gray-800">
                            {cert.name}
                          </p>
                          <p className="text-gray-600">{cert.issuer}</p>
                          <p className="text-gray-500 text-xs">{cert.date}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* FOOTER */}
              <div className="text-center text-xs text-gray-500 mt-6 pb-4">
                Page 1/2 — © {new Date().getFullYear()} CV Builder
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 shadow-sm">
        {/* Loading Status Banner */}
        {isDownloading && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-green-700">Đang tạo & lưu CV...</span>
          </div>
        )}
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-gray-600"></div>
          <div className="flex space-x-3">
            <Link
              href="/candidate/cm-profile"
              className={`px-4 py-2 bg-[#163988] hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1 ${isDownloading ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={(e) => isDownloading && e.preventDefault()}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 18V20H8V18H16ZM12 2C13.3132 2 14.6136 2.25866 15.8268 2.7612C17.0401 3.26375 18.1425 4.00035 19.0711 4.92893C19.9997 5.85752 20.7362 6.95991 21.2388 8.17317C21.7413 9.38642 22 10.6868 22 12C22 14.6522 20.9464 17.1957 19.0711 19.0711C17.1957 20.9464 14.6522 22 12 22C10.6868 22 9.38642 21.7413 8.17317 21.2388C6.95991 20.7362 5.85752 19.9997 4.92893 19.0711C3.05357 17.1957 2 14.6522 2 12C2 9.34784 3.05357 6.8043 4.92893 4.92893C6.8043 3.05357 9.34784 2 12 2ZM12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4ZM12 11H16V13H12V16L8 12L12 8V11Z"
                  fill="white"
                />
              </svg>
              Update your profile
            </Link>

            {/* <button
              onClick={handleDownloadCV}
              disabled={isDownloading}
              className="px-4 py-2 border border-gray-300 bg-gradient-to-r from-[#3a4660] to-gray-300 text-white rounded-md hover:bg-gradient-to-r hover:from-[#3a4660] hover:to-[#3a4660] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download as PDF using html2canvas"
            >
              {isDownloading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download PDF
                </>
              )}
            </button> */}

            {/* Save to Firebase Button */}
            <button
              onClick={() => {
                // Get userId from auth store
                const userId = candidateId?.toString() || user?.id?.toString();
                if (!userId) {
                  toast.error("Bạn cần đăng nhập để lưu CV");
                  return;
                }
                
                // Check if resumeId exists before attempting export
                if (!resumeId) {
                  toast.error(
                    "Cannot export CV: Resume ID is missing. Please save your CV first.",
                    { duration: 5000 }
                  );
                  return;
                }
                
                handleExportAndSavePDF(userId);
              }}
              disabled={!isMounted || isDownloading || !user || !resumeId}
              className="px-3 py-2 border border-green-400 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !isMounted || !user 
                  ? "Đăng nhập để lưu CV" 
                  : !resumeId 
                  ? "Please save your CV first before exporting" 
                  : "Export PDF and save to Firebase Storage"
              }
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Save and download CV
                </>
              )}
            </button>

            {/* <button
              onClick={() => handleDirectPDF(cvData)}
              className="px-3 py-2 border border-blue-400 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-2"
              title="Direct PDF generation (simple text-based)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Simple PDF
            </button> */}
{/* 
            <button
              onClick={handlePrintPDF}
              className="px-3 py-2 border border-gray-400 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Print to PDF (browser print dialog)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
