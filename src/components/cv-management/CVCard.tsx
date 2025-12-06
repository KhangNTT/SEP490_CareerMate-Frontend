import { CV } from "@/services/cvService";
import { useState, useCallback } from "react";
import toast from "react-hot-toast";

interface CVCardProps {
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

export const CVCard = ({
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
}: CVCardProps) => {
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
      className={`w-full max-w-[280px] mx-auto relative z-10 rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:border-[#3a4660] transition-shadow duration-200 ${
        isDefault ? "ring-2 ring-[#3a4660] border-[#3a4660]" : "border border-gray-300"
      } bg-white flex flex-col`}
    >
      {/* Preview Thumbnail */}
      <div
        className="h-[180px] bg-gray-50 relative group cursor-pointer flex items-center justify-center"
        onClick={onPreview}
      >
        {cv.parsedStatus === "processing" ? (
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-[#3a4660] rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-gray-500">Processing...</p>
          </div>
        ) : (
          <svg
            className="w-16 h-16 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-medium shadow-md">
            Preview
          </button>
        </div>

        {/* Source Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${source.color}`}>
            {source.label}
          </span>
        </div>

        {/* Privacy Badge */}
        <div className="absolute top-2 right-2">
          <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
            {cv.privacy === "private" ? (
              <>
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-[10px] text-gray-600">Private</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-[10px] text-gray-600">Public</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CV Info Bar at Bottom */}
      <div className="p-3 bg-white border-t border-gray-100">
        {isDefault && (
          <span className="inline-block px-2 py-0.5 mb-2 bg-[#3a4660] text-white text-[10px] font-semibold rounded-full">
            Default
          </span>
        )}

        <h3 className="font-medium text-xs text-gray-900 mb-1 truncate leading-tight" title={cv.name}>
          {cv.name}
        </h3>

        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
          <span>{new Date(cv.updatedAt).toLocaleDateString("en-US")}</span>
          {cv.fileSize && <span>{cv.fileSize}</span>}
        </div>

        {/* Syncing Status Banner */}
        {isSyncing && (
          <div className="flex items-center gap-1.5 px-2 py-1 mb-2 bg-blue-50 border border-blue-200 rounded text-blue-700">
            <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-[10px] font-medium">Đang đồng bộ...</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 items-center">
          {!isDefault && onSetDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault();
              }}
              disabled={isDisabled}
              className="flex-1 px-2 py-1 text-[10px] font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex-1 px-2 py-1 text-[10px] font-medium text-white bg-gradient-to-r from-[#3a4660] to-gray-400 hover:from-[#3a4660] hover:to-[#3a4660] rounded transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              title="Edit CV in profile"
            >
              Edit
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
              className="flex-1 px-2 py-1 text-[10px] font-medium text-white bg-gradient-to-r from-[#3a4660] to-gray-400 hover:from-[#3a4660] hover:to-[#3a4660] rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-1"
              title={cv.parsedStatus !== "ready" ? "CV not parsed yet" : "Sync CV to profile"}
            >
              {isSyncing ? (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Syncing...</span>
                </>
              ) : (
                "Sync"
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
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 bottom-full mb-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                  {onPreview && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Rename
                  </button> */}

                  <hr className="my-0.5" />
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
};
