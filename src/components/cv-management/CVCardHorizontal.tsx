import { CV } from "@/services/cvService";
import { useState, memo, useCallback } from "react";
import toast from "react-hot-toast";

interface CVCardHorizontalProps {
  cv: CV;
  isDefault?: boolean;
  onSetDefault?: () => void;
  onPreview?: () => void;
  onSync?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  // Loading states
  isSyncing?: boolean;
  isDisabled?: boolean;
}

export const CVCardHorizontal = ({
  cv,
  isDefault = false,
  onSetDefault,
  onPreview,
  onSync,
  onEdit,
  onDelete,
  onDownload,
  isSyncing = false,
  isDisabled = false
}: CVCardHorizontalProps) => {
  const [showMenu, setShowMenu] = useState(false);

  // Download CV handler
  const handleDownload = useCallback(async () => {
    const downloadUrl = cv.downloadUrl || cv.fileUrl;
    
    if (!downloadUrl) {
      toast.error("No download URL available for this CV");
      return;
    }

    try {
      toast.loading("Downloading CV...", { id: "download-cv" });
      
      // Fetch the file
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch CV file");
      }
      
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = cv.name || "CV.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("CV downloaded successfully!", { id: "download-cv" });
      
      // Call onDownload callback if provided
      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download CV", { id: "download-cv" });
    }
  }, [cv.downloadUrl, cv.fileUrl, cv.name, onDownload]);

  const getSourceBadge = () => {
    const sources = {
      upload: { label: "Uploaded", color: "bg-blue-100 text-blue-700" },
      builder: { label: "Builder", color: "bg-purple-100 text-purple-700" },
      draft: { label: "Draft", color: "bg-orange-100 text-orange-700" }
    };
    return sources[cv.source ?? "upload"];
  };

  const source = getSourceBadge();

  return (
    <div
      className={`
        relative
        w-full rounded-xl bg-white transition-all duration-300
        border shadow-sm hover:shadow-md hover:border-[#3a4660]
        mb-4
        ${isDefault ? "ring-2 ring-[#3a4660] border-[#3a4660]" : "border-gray-200"}
      `}
    >
      <div className="flex flex-col sm:flex-row gap-4 p-4 h-auto">
        {/* Left: Thumbnail/Icon */}
        <div
          className="flex-shrink-0 w-full sm:w-24 h-24 sm:h-auto bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center cursor-pointer group hover:from-gray-100 hover:to-gray-200 transition-colors"
          onClick={onPreview}
        >
          {cv.parsedStatus === "processing" ? (
            <div className="text-center">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-[#3a4660] rounded-full animate-spin mx-auto mb-1"></div>
              <p className="text-[10px] text-gray-500">Processing...</p>
            </div>
          ) : (
            <svg
              className="w-12 h-12 text-gray-400 group-hover:text-[#3a4660] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          )}
        </div>

        {/* Right: Info Section */}
        <div className="flex-1 flex flex-col justify-between min-w-0 gap-3">
          {/* Top Row: Badges */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${source.color}`}>
              {source.label}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 flex items-center gap-1">
              {cv.privacy === "private" ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Private</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Public</span>
                </>
              )}
            </span>
          </div>

          {/* Middle Row: CV Name & Default Badge */}
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-sm text-gray-900 truncate cursor-pointer hover:text-[#3a4660] transition-colors"
              title={cv.name}
              onClick={onPreview}
            >
              {cv.name}
            </h3>
            {isDefault && (
              <span className="flex-shrink-0 px-2 py-0.5 bg-[#3a4660] text-white text-xs font-semibold rounded-full">
                Default
              </span>
            )}
          </div>

          {/* Bottom Row: Date, Size & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {new Date(cv.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
              {cv.fileSize && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{cv.fileSize}</span>
                </>
              )}
            </div>

            {/* Syncing Status Banner */}
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-xs font-medium">Đang đồng bộ CV...</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {!isDefault && onSetDefault && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDefault();
                  }}
                  disabled={isDisabled}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set Default
                </button>
              )}

              {/* Edit Button - Show for builder and draft CVs */}
              {onEdit && (cv.source === "builder" || cv.source === "draft") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  disabled={isDisabled}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[#3a4660] to-gray-400 hover:from-[#3a4660] hover:to-[#3a4660] rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Edit CV in profile"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>Edit</span>
                </button>
              )}

              {/* Sync Button - Only show for uploaded CVs */}
              {onSync && cv.source === "upload" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSync();
                  }}
                  disabled={cv.parsedStatus !== "ready" || isDisabled}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[#3a4660] to-gray-400 hover:from-[#3a4660] hover:to-[#3a4660] rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                  title={cv.parsedStatus !== "ready" ? "CV not parsed yet" : "Sync CV to profile"}
                >
                  {isSyncing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Đang đồng bộ...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>Sync</span>
                    </>
                  )}
                </button>
              )}

              {/* More Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  disabled={isDisabled}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                </button>

                {showMenu && (
                  <>
                    {/* Overlay */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    ></div>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                      {onPreview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          Preview
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download
                      </button>

                      {/* <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Rename logic
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Rename
                      </button> */}

                      <hr className="my-1 border-gray-200" />

                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ Wrap with React.memo to prevent unnecessary re-renders when props don't change
export default memo(CVCardHorizontal);
