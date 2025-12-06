import React, { memo } from 'react';
import { Building2 } from "lucide-react";
import { VscRemoteExplorer } from 'react-icons/vsc';
import { TbArrowsExchange } from 'react-icons/tb';
import type { IconType } from 'react-icons';

interface JobCardProps {
  id: number;
  title: string;
  company: string;
  location: string;
  postedAgo: string;
  workMode: string;
  skills: string[];
  isHot?: boolean;
  isNegotiable?: boolean;
  isRemote?: boolean;
  companyType?: string;
  isSelected?: boolean;
  salaryRange?: string;
}

const getWorkModeUI = (
  workMode: string
): { Icon: IconType | typeof Building2; className: string; label: string } => {
  const mode = workMode.toLowerCase();
  if (mode.includes("remote")) {
    return { Icon: VscRemoteExplorer, className: "text-indigo-600", label: workMode };
  }
  if (mode.includes("hybrid")) {
    return { Icon: TbArrowsExchange, className: "text-violet-600", label: workMode };
  }
  return { Icon: Building2, className: "text-violet-600", label: workMode };
};

const JobCard: React.FC<JobCardProps> = ({
  title,
  company,
  location,
  postedAgo,
  workMode,
  skills,
  isHot = false,
  isNegotiable = false,
  isRemote = false,
  companyType,
  isSelected = false,
  salaryRange
}) => {
  // ✅ TÍNH Ở ĐÂY (ngoài JSX)
  const { Icon, className, label } = getWorkModeUI(workMode);

  return (
    <div className={`bg-white rounded-xl border-2 p-5 transition-all duration-200 ${
      isSelected 
        ? 'border-[#3a4660] shadow-lg bg-gradient-to-r from-slate-50 to-blue-50 ring-1 ring-[#3a4660]/20' 
        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isHot && (
              <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 shadow-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path>
                </svg>
                HOT
              </span>
            )}
            <h3 className="text-base font-semibold text-gray-900 flex-1 leading-tight">{title}</h3>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 bg-gradient-to-br from-[#3a4660] to-slate-500 rounded flex-shrink-0"></span>
            <span className="text-sm font-medium text-gray-700">{company}</span>
          </div>

          {salaryRange && (
            <div className="mb-3">
              <span className="salary-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-xs shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                💰 {salaryRange}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2.5 mb-4">
        {isNegotiable && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#3a4660] rounded-full"></span>
            <span className="text-sm text-[#3a4660] font-medium">Negotiate</span>
          </div>
        )}

        {/* ✅ DÙNG BIẾN Icon/label/className ĐÃ TÍNH Ở TRÊN */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50">
            <Icon className={`w-4 h-4 ${className}`} />
            <span className="font-medium">{label}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {location}
          </span>
        </div>

        {companyType && <div className="text-[13px] text-gray-500">🏢 {companyType}</div>}
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((skill, index) => (
            <span key={index} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
              {skill}
            </span>
          ))}
          {skills.length > 5 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md">
              +{skills.length - 5}
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400 pt-3 border-t border-gray-100">Posted {postedAgo}</div>
    </div>
  );
};

// ✅ Wrap with React.memo to prevent unnecessary re-renders when props don't change
export default memo(JobCard);
