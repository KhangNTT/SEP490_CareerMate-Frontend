"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  FiUser, FiBook, FiBriefcase, FiCode, FiAward, FiFolder, 
  FiFileText, FiChevronDown, FiChevronUp, FiTrash2, FiPlus, FiStar, FiGlobe, FiEye, FiEyeOff
} from "react-icons/fi";
import { ParsedCV, Education, Experience, Project, Certification, Language } from "@/types/parsedCV";

// Award interface for parsed data
interface Award {
  name?: string;
  organization?: string;
  date?: string;
  month?: string;
  year?: string;
  description?: string;
}

// Extended ParsedCV to include awards and normalized skills
interface ExtendedParsedCV extends ParsedCV {
  awards?: Award[];
  core_skills?: Array<{ skill: string; experience?: string }>;
  soft_skills?: string[];
}

interface SyncCVSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedCV | null;
  onConfirm: (editedData: ParsedCV) => Promise<void>;
  isLoading?: boolean;
  cvUrl?: string; // URL to the original CV file for preview
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultExpanded = true }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          {icon}
          <span>{title}</span>
        </div>
        {expanded ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {expanded && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

// Month options for dropdowns
const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Generate years from 1976 to 2025 (max year = 2025)
const YEARS = Array.from({ length: 50 }, (_, i) => {
  const year = 2025 - i;
  return { value: year.toString(), label: year.toString() };
});

// Degree options for education
const DEGREE_OPTIONS = [
  { value: 'College', label: 'College' },
  { value: 'Bachelor', label: 'Bachelor' },
  { value: 'Master', label: 'Master' },
  { value: 'PhD', label: 'PhD' },
  { value: 'Other', label: 'Other' },
];

// Language proficiency levels (matching cm-profile LanguageDialog)
const PROFICIENCY_LEVELS = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Elementary', label: 'Elementary' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Upper Intermediate', label: 'Upper Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
  { value: 'Native', label: 'Native' },
];

// Experience level options
const EXPERIENCE_LEVELS = [
  { value: '1', label: '< 1 year' },
  { value: '2', label: '1-2 years' },
  { value: '3', label: '2-3 years' },
  { value: '5', label: '3-5 years' },
  { value: '7', label: '5-7 years' },
  { value: '10', label: '7+ years' },
];

export default function SyncCVSummaryDialog({
  open,
  onOpenChange,
  parsedData,
  onConfirm,
  isLoading = false,
  cvUrl
}: SyncCVSummaryDialogProps) {
  const [editedData, setEditedData] = useState<ExtendedParsedCV | null>(parsedData as ExtendedParsedCV);
  const [saving, setSaving] = useState(false);
  const [showCVPreview, setShowCVPreview] = useState(false);

  // Update editedData when parsedData changes
  // Transform Python API format to internal format
  useEffect(() => {
    if (parsedData) {
      const extendedData: ExtendedParsedCV = { ...parsedData };
      
      // Transform skills from Python API format: { soft_skills[], technical_skills[] }
      // to internal format: core_skills[], soft_skills[]
      if (parsedData.skills && typeof parsedData.skills === 'object' && !Array.isArray(parsedData.skills)) {
        const skillsObj = parsedData.skills as { soft_skills?: string[]; technical_skills?: string[] };
        
        // Map technical_skills to core_skills with experience field
        if (skillsObj.technical_skills && Array.isArray(skillsObj.technical_skills)) {
          extendedData.core_skills = skillsObj.technical_skills.map(skill => ({
            skill: skill,
            experience: '1' // Default 1 year
          }));
        }
        
        // Map soft_skills directly
        if (skillsObj.soft_skills && Array.isArray(skillsObj.soft_skills)) {
          extendedData.soft_skills = skillsObj.soft_skills;
        }
      }
      
      // Ensure education has field property (major)
      if (parsedData.education && Array.isArray(parsedData.education)) {
        extendedData.education = parsedData.education.map(edu => ({
          ...edu,
          field: edu.field || edu.degree || '', // Use degree as fallback for major/field
        }));
      }
      
      // Ensure projects have description from tech_stack if missing
      if (parsedData.projects && Array.isArray(parsedData.projects)) {
        extendedData.projects = parsedData.projects.map(proj => ({
          ...proj,
          description: proj.description || (proj.tech_stack ? `Technologies: ${proj.tech_stack.join(', ')}` : ''),
        }));
      }
      
      console.log('📋 Transformed parsed data for dialog:', extendedData);
      setEditedData(extendedData);
    }
  }, [parsedData]);

  const handleConfirm = async () => {
    if (!editedData) return;
    
    setSaving(true);
    try {
      // Transform back to ParsedCV format that onConfirm handler expects
      const dataToSync: ParsedCV = {
        ...editedData,
        // Transform core_skills and soft_skills back to skills object format
        skills: {
          technical_skills: editedData.core_skills?.map(s => s.skill) || [],
          soft_skills: editedData.soft_skills || [],
        },
        // Keep languages
        languages: editedData.languages,
      };
      
      console.log('📤 Data to sync:', dataToSync);
      await onConfirm(dataToSync);
    } finally {
      setSaving(false);
    }
  };

  if (!parsedData || !editedData) {
    return null;
  }

  // Helper to update nested data
  const updateField = (path: string, value: any) => {
    setEditedData(prev => {
      if (!prev) return prev;
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const updateArrayItem = (arrayPath: string, index: number, field: string, value: any) => {
    setEditedData(prev => {
      if (!prev) return prev;
      const newData = { ...prev };
      const array = [...(newData as any)[arrayPath]];
      array[index] = { ...array[index], [field]: value };
      (newData as any)[arrayPath] = array;
      return newData;
    });
  };

  const removeArrayItem = (arrayPath: string, index: number) => {
    setEditedData(prev => {
      if (!prev) return prev;
      const newData = { ...prev };
      const array = [...(newData as any)[arrayPath]];
      array.splice(index, 1);
      (newData as any)[arrayPath] = array;
      return newData;
    });
  };

  const addArrayItem = (arrayPath: string, newItem: any) => {
    setEditedData(prev => {
      if (!prev) return prev;
      const newData = { ...prev };
      const array = [...((newData as any)[arrayPath] || [])];
      array.push(newItem);
      (newData as any)[arrayPath] = array;
      return newData;
    });
  };

  // Parse date string to month/year
  const parseDateToMonthYear = (dateStr: string | undefined): { month: string; year: string } => {
    if (!dateStr) return { month: '', year: '' };
    // Try to extract month and year from various formats
    const parts = dateStr.split(/[-\/]/);
    if (parts.length >= 2) {
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);
      if (first > 12) {
        // YYYY-MM format
        return { year: parts[0], month: parts[1].padStart(2, '0') };
      } else {
        // MM-YYYY format
        return { month: parts[0].padStart(2, '0'), year: parts[1] };
      }
    }
    // Just year
    if (dateStr.length === 4) {
      return { month: '', year: dateStr };
    }
    return { month: '', year: '' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${showCVPreview ? 'max-w-[95vw]' : 'max-w-4xl'} max-h-[90vh] overflow-hidden bg-white transition-all duration-300`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FiFileText className="text-blue-600" />
                Review Parsed CV Data
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Review and edit the parsed data before syncing to your profile
              </p>
            </div>
            {cvUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCVPreview(!showCVPreview)}
                className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                {showCVPreview ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                {showCVPreview ? 'Hide CV' : 'Check with your CV'}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className={`flex gap-4 ${showCVPreview ? 'flex-row' : 'flex-col'}`}>
          {/* Main Content - Form */}
          <div className={`space-y-4 py-4 overflow-y-auto ${showCVPreview ? 'w-1/2 max-h-[calc(90vh-180px)]' : 'w-full max-h-[calc(90vh-180px)]'}`}>
          {/* About Me Section */}
          <CollapsibleSection 
            title="About Me" 
            icon={<FiUser className="w-4 h-4" />}
          >
            <Textarea
              value={editedData.summary || editedData.aboutMe || editedData.about_me || ''}
              onChange={(e) => {
                updateField('summary', e.target.value);
                updateField('aboutMe', e.target.value);
                updateField('about_me', e.target.value);
              }}
              placeholder="Professional summary..."
              className="min-h-[100px]"
            />
          </CollapsibleSection>

          {/* Education Section */}
          <CollapsibleSection 
            title={`Education (${editedData.education?.length || 0})`}
            icon={<FiBook className="w-4 h-4" />}
          >
            {editedData.education && editedData.education.length > 0 ? (
              <div className="space-y-4">
                {editedData.education.map((edu: Education, index: number) => {
                  const startDate = parseDateToMonthYear(edu.start_date);
                  const endDate = parseDateToMonthYear(edu.end_date);
                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg relative bg-gray-50">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('education', index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                        title="Remove"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        {/* School/University */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">School/University <span className="text-red-500">*</span></label>
                          <Input
                            value={edu.institution || ''}
                            onChange={(e) => updateArrayItem('education', index, 'institution', e.target.value)}
                            placeholder="Enter school or university name"
                            className="mt-1"
                          />
                        </div>
                        {/* Degree */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Degree <span className="text-red-500">*</span></label>
                          <select
                            value={edu.degree || ''}
                            onChange={(e) => updateArrayItem('education', index, 'degree', e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select degree</option>
                            {DEGREE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                        </div>
                        {/* Major */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Major <span className="text-red-500">*</span></label>
                          <Input
                            value={edu.field || ''}
                            onChange={(e) => updateArrayItem('education', index, 'field', e.target.value)}
                            placeholder="e.g., Computer Science"
                            className="mt-1"
                          />
                        </div>
                        {/* Start Month/Year */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Start Month/Year <span className="text-red-500">*</span></label>
                          <div className="flex gap-2 mt-1">
                            <select
                              value={startDate.month}
                              onChange={(e) => updateArrayItem('education', index, 'start_date', `${e.target.value}/${startDate.year || new Date().getFullYear()}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Month</option>
                              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                              value={startDate.year}
                              onChange={(e) => updateArrayItem('education', index, 'start_date', `${startDate.month || '01'}/${e.target.value}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Year</option>
                              {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* End Month/Year */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">End Month/Year</label>
                          <div className="flex gap-2 mt-1">
                            <select
                              value={endDate.month}
                              onChange={(e) => updateArrayItem('education', index, 'end_date', `${e.target.value}/${endDate.year || new Date().getFullYear()}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Month</option>
                              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                              value={endDate.year}
                              onChange={(e) => updateArrayItem('education', index, 'end_date', `${endDate.month || '01'}/${e.target.value}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Year</option>
                              {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Add Education Button */}
                <button
                  type="button"
                  onClick={() => addArrayItem('education', { institution: '', degree: '', field: '', start_date: '', end_date: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <FiPlus className="w-4 h-4" /> Add Education
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm italic mb-3">No education data found</p>
                <button
                  type="button"
                  onClick={() => addArrayItem('education', { institution: '', degree: '', field: '', start_date: '', end_date: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mx-auto"
                >
                  <FiPlus className="w-4 h-4" /> Add Education
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Work Experience Section */}
          <CollapsibleSection 
            title={`Work Experience (${editedData.experience?.length || 0})`}
            icon={<FiBriefcase className="w-4 h-4" />}
          >
            {editedData.experience && editedData.experience.length > 0 ? (
              <div className="space-y-4">
                {editedData.experience.map((exp: Experience, index: number) => {
                  const startDate = parseDateToMonthYear(exp.start_date);
                  const endDate = parseDateToMonthYear(exp.end_date);
                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg relative bg-gray-50">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('experience', index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                        title="Remove"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        {/* Company Name */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Company Name <span className="text-red-500">*</span></label>
                          <Input
                            value={exp.company || ''}
                            onChange={(e) => updateArrayItem('experience', index, 'company', e.target.value)}
                            placeholder="Enter company name"
                            className="mt-1"
                          />
                        </div>
                        {/* Job Title */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Job Title <span className="text-red-500">*</span></label>
                          <Input
                            value={exp.title || exp.position || ''}
                            onChange={(e) => updateArrayItem('experience', index, 'title', e.target.value)}
                            placeholder="e.g., Senior Software Engineer"
                            className="mt-1"
                          />
                        </div>
                        {/* Start Month/Year */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Start Month/Year <span className="text-red-500">*</span></label>
                          <div className="flex gap-2 mt-1">
                            <select
                              value={startDate.month}
                              onChange={(e) => updateArrayItem('experience', index, 'start_date', `${e.target.value}/${startDate.year || new Date().getFullYear()}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Month</option>
                              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                              value={startDate.year}
                              onChange={(e) => updateArrayItem('experience', index, 'start_date', `${startDate.month || '01'}/${e.target.value}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Year</option>
                              {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* End Month/Year */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">End Month/Year <span className="text-red-500">*</span></label>
                          <div className="flex gap-2 mt-1">
                            <select
                              value={endDate.month}
                              onChange={(e) => updateArrayItem('experience', index, 'end_date', `${e.target.value}/${endDate.year || new Date().getFullYear()}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Month</option>
                              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                              value={endDate.year}
                              onChange={(e) => updateArrayItem('experience', index, 'end_date', `${endDate.month || '01'}/${e.target.value}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Year</option>
                              {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* Project/Responsibilities */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Project/Responsibilities</label>
                          <Input
                            value={(exp as any).project || (exp as any).responsibilities || ''}
                            onChange={(e) => updateArrayItem('experience', index, 'project', e.target.value)}
                            placeholder="Main project or key responsibility"
                            className="mt-1"
                          />
                        </div>
                        {/* Description */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Description</label>
                          <Textarea
                            value={exp.description || ''}
                            onChange={(e) => updateArrayItem('experience', index, 'description', e.target.value)}
                            placeholder="Describe your key achievements, responsibilities, and technologies used..."
                            className="mt-1 min-h-[100px]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Add Experience Button */}
                <button
                  type="button"
                  onClick={() => addArrayItem('experience', { company: '', title: '', start_date: '', end_date: '', project: '', description: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <FiPlus className="w-4 h-4" /> Add Work Experience
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm italic mb-3">No work experience data found</p>
                <button
                  type="button"
                  onClick={() => addArrayItem('experience', { company: '', title: '', start_date: '', end_date: '', project: '', description: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mx-auto"
                >
                  <FiPlus className="w-4 h-4" /> Add Work Experience
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Skills Section */}
          <CollapsibleSection 
            title="Skills"
            icon={<FiCode className="w-4 h-4" />}
          >
            <div className="space-y-6">
              {/* Core Skills */}
              <div className="p-4 border border-gray-200 rounded-lg bg-amber-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-600">💡</span>
                  <span className="text-sm text-amber-800 font-medium">Core Skills</span>
                </div>
                <p className="text-xs text-amber-700 mb-4">
                  <strong>Tips:</strong> Organize your core skills into groups helps recruiters quickly understand your professional capabilities.
                </p>
                <div className="space-y-3">
                  <label className="text-xs text-gray-600 font-medium">List skills ({editedData.core_skills?.length || (Array.isArray(editedData.skills) ? editedData.skills.length : 0)}/20)</label>
                  {/* Core skills items */}
                  <div className="space-y-2">
                    {(editedData.core_skills || (Array.isArray(editedData.skills) ? editedData.skills.map(s => ({ skill: s, experience: '' })) : [])).map((skillItem: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={typeof skillItem === 'string' ? skillItem : skillItem.skill || ''}
                          onChange={(e) => {
                            const skills = [...(editedData.core_skills || (Array.isArray(editedData.skills) ? editedData.skills.map(s => ({ skill: s, experience: '' })) : []))];
                            skills[index] = { ...skills[index], skill: e.target.value };
                            updateField('core_skills', skills);
                          }}
                          placeholder="Enter skill"
                          className="flex-1"
                        />
                        <select
                          value={typeof skillItem === 'object' ? skillItem.experience || '' : ''}
                          onChange={(e) => {
                            const skills = [...(editedData.core_skills || (Array.isArray(editedData.skills) ? editedData.skills.map(s => ({ skill: s, experience: '' })) : []))];
                            skills[index] = { ...skills[index], experience: e.target.value };
                            updateField('core_skills', skills);
                          }}
                          className="w-40 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select experience</option>
                          {EXPERIENCE_LEVELS.map(exp => (
                            <option key={exp.value} value={exp.value}>{exp.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const skills = [...(editedData.core_skills || [])];
                            skills.splice(index, 1);
                            updateField('core_skills', skills);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add Core Skill */}
                  <button
                    type="button"
                    onClick={() => {
                      const skills = [...(editedData.core_skills || [])];
                      skills.push({ skill: '', experience: '' });
                      updateField('core_skills', skills);
                    }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <FiPlus className="w-4 h-4" /> Add Core Skill
                  </button>
                </div>
              </div>

              {/* Soft Skills */}
              <div className="p-4 border border-gray-200 rounded-lg bg-pink-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-pink-600">💡</span>
                  <span className="text-sm text-pink-800 font-medium">Soft Skills</span>
                </div>
                <p className="text-xs text-pink-700 mb-4">
                  <strong>Tips:</strong> Highlight soft skills that demonstrate how you add value beyond professional abilities.
                </p>
                <div className="space-y-3">
                  <label className="text-xs text-gray-600 font-medium">List skills ({editedData.soft_skills?.length || 0}/20)</label>
                  {/* Soft skills items */}
                  <div className="space-y-2">
                    {(editedData.soft_skills || []).map((skill: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={skill}
                          onChange={(e) => {
                            const skills = [...(editedData.soft_skills || [])];
                            skills[index] = e.target.value;
                            updateField('soft_skills', skills);
                          }}
                          placeholder="Enter skill"
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const skills = [...(editedData.soft_skills || [])];
                            skills.splice(index, 1);
                            updateField('soft_skills', skills);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add Soft Skill */}
                  <button
                    type="button"
                    onClick={() => {
                      const skills = [...(editedData.soft_skills || [])];
                      skills.push('');
                      updateField('soft_skills', skills);
                    }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <FiPlus className="w-4 h-4" /> Add Soft Skill
                  </button>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Certificates Section */}
          <CollapsibleSection 
            title={`Certificates (${editedData.certificates?.length || editedData.certifications?.length || 0})`}
            icon={<FiAward className="w-4 h-4" />}
          >
            {((editedData.certificates || editedData.certifications) as Certification[] | undefined)?.length ? (
              <div className="space-y-4">
                {((editedData.certificates || editedData.certifications || []) as Certification[]).map((cert: Certification, index: number) => {
                  const certDate = parseDateToMonthYear(cert.date);
                  const arrayPath = editedData.certificates ? 'certificates' : 'certifications';
                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg relative bg-gray-50">
                      <button
                        type="button"
                        onClick={() => removeArrayItem(arrayPath, index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                        title="Remove"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        {/* Certificate Name */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Certificate Name <span className="text-red-500">*</span></label>
                          <Input
                            value={cert.name || ''}
                            onChange={(e) => updateArrayItem(arrayPath, index, 'name', e.target.value)}
                            placeholder="Enter certificate name"
                            className="mt-1"
                          />
                        </div>
                        {/* Issuing Organization */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Issuing Organization <span className="text-red-500">*</span></label>
                          <Input
                            value={cert.issuer || ''}
                            onChange={(e) => updateArrayItem(arrayPath, index, 'issuer', e.target.value)}
                            placeholder="Enter organization name"
                            className="mt-1"
                          />
                        </div>
                        {/* Issue Month/Year */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Issue Month/Year <span className="text-red-500">*</span></label>
                          <div className="flex gap-2 mt-1">
                            <select
                              value={certDate.month}
                              onChange={(e) => updateArrayItem(arrayPath, index, 'date', `${e.target.value}/${certDate.year || new Date().getFullYear()}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Month</option>
                              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                              value={certDate.year}
                              onChange={(e) => updateArrayItem(arrayPath, index, 'date', `${certDate.month || '01'}/${e.target.value}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Year</option>
                              {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* Certificate URL */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Certificate URL</label>
                          <Input
                            value={(cert as any).url || ''}
                            onChange={(e) => updateArrayItem(arrayPath, index, 'url', e.target.value)}
                            placeholder="https://example.com/certificate"
                            className="mt-1"
                          />
                        </div>
                        {/* Description */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Description</label>
                          <Textarea
                            value={(cert as any).description || ''}
                            onChange={(e) => updateArrayItem(arrayPath, index, 'description', e.target.value)}
                            placeholder="Describe what skills or knowledge this certificate validates..."
                            className="mt-1 min-h-[80px]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Add Certificate Button */}
                <button
                  type="button"
                  onClick={() => addArrayItem('certificates', { name: '', issuer: '', date: '', url: '', description: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <FiPlus className="w-4 h-4" /> Add Certificate
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm italic mb-3">No certificates found</p>
                <button
                  type="button"
                  onClick={() => addArrayItem('certificates', { name: '', issuer: '', date: '', url: '', description: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mx-auto"
                >
                  <FiPlus className="w-4 h-4" /> Add Certificate
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Projects Section */}
          <CollapsibleSection 
            title={`Highlight Projects (${editedData.projects?.length || 0})`}
            icon={<FiFolder className="w-4 h-4" />}
          >
            {editedData.projects && editedData.projects.length > 0 ? (
              <div className="space-y-4">
                {editedData.projects.map((project: Project, index: number) => {
                  const startDate = parseDateToMonthYear(project.start_date);
                  const endDate = parseDateToMonthYear(project.end_date);
                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg relative bg-gray-50">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('projects', index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                        title="Remove"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        {/* Project Name */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Project Name <span className="text-red-500">*</span></label>
                          <Input
                            value={project.name || ''}
                            onChange={(e) => updateArrayItem('projects', index, 'name', e.target.value)}
                            placeholder="Enter project name"
                            className="mt-1"
                          />
                        </div>
                        {/* Start Month/Year */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Start Month/Year <span className="text-red-500">*</span></label>
                          <div className="flex gap-2 mt-1">
                            <select
                              value={startDate.month}
                              onChange={(e) => updateArrayItem('projects', index, 'start_date', `${e.target.value}/${startDate.year || new Date().getFullYear()}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Month</option>
                              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                              value={startDate.year}
                              onChange={(e) => updateArrayItem('projects', index, 'start_date', `${startDate.month || '01'}/${e.target.value}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Year</option>
                              {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* End Month/Year */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">End Month/Year <span className="text-red-500">*</span></label>
                          <div className="flex gap-2 mt-1">
                            <select
                              value={endDate.month}
                              onChange={(e) => updateArrayItem('projects', index, 'end_date', `${e.target.value}/${endDate.year || new Date().getFullYear()}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Month</option>
                              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                              value={endDate.year}
                              onChange={(e) => updateArrayItem('projects', index, 'end_date', `${endDate.month || '01'}/${e.target.value}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Year</option>
                              {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* Project URL */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Project URL</label>
                          <Input
                            value={project.url || ''}
                            onChange={(e) => updateArrayItem('projects', index, 'url', e.target.value)}
                            placeholder="https://github.com/username/project"
                            className="mt-1"
                          />
                        </div>
                        {/* Description */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Description</label>
                          <Textarea
                            value={project.description || ''}
                            onChange={(e) => updateArrayItem('projects', index, 'description', e.target.value)}
                            placeholder="Describe your role, technologies used, and key achievements..."
                            className="mt-1 min-h-[100px]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Add Project Button */}
                <button
                  type="button"
                  onClick={() => addArrayItem('projects', { name: '', start_date: '', end_date: '', url: '', description: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <FiPlus className="w-4 h-4" /> Add Project
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm italic mb-3">No projects found</p>
                <button
                  type="button"
                  onClick={() => addArrayItem('projects', { name: '', start_date: '', end_date: '', url: '', description: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mx-auto"
                >
                  <FiPlus className="w-4 h-4" /> Add Project
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Languages Section */}
          <CollapsibleSection 
            title={`Languages (${editedData.languages?.length || 0})`}
            icon={<FiGlobe className="w-4 h-4" />}
          >
            {editedData.languages && editedData.languages.length > 0 ? (
              <div className="space-y-4">
                {editedData.languages.map((lang: Language, index: number) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg relative bg-gray-50">
                    <button
                      type="button"
                      onClick={() => removeArrayItem('languages', index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                      title="Remove"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                      {/* Language Name */}
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Language <span className="text-red-500">*</span></label>
                        <Input
                          value={lang.name || ''}
                          onChange={(e) => updateArrayItem('languages', index, 'name', e.target.value)}
                          placeholder="e.g., English, Japanese"
                          className="mt-1"
                        />
                      </div>
                      {/* Proficiency Level */}
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Proficiency Level <span className="text-red-500">*</span></label>
                        <select
                          value={lang.level || lang.proficiency || ''}
                          onChange={(e) => updateArrayItem('languages', index, 'level', e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select level</option>
                          {PROFICIENCY_LEVELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Add Language Button */}
                <button
                  type="button"
                  onClick={() => addArrayItem('languages', { name: '', level: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <FiPlus className="w-4 h-4" /> Add Language
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm italic mb-3">No languages found</p>
                <button
                  type="button"
                  onClick={() => addArrayItem('languages', { name: '', level: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mx-auto"
                >
                  <FiPlus className="w-4 h-4" /> Add Language
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Awards Section */}
          <CollapsibleSection 
            title={`Awards (${editedData.awards?.length || 0})`}
            icon={<FiStar className="w-4 h-4" />}
          >
            {editedData.awards && editedData.awards.length > 0 ? (
              <div className="space-y-4">
                {editedData.awards.map((award: Award, index: number) => {
                  const awardDate = parseDateToMonthYear(award.date || `${award.month || ''}/${award.year || ''}`);
                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg relative bg-gray-50">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('awards', index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                        title="Remove"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        {/* Award Name */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Award Name <span className="text-red-500">*</span></label>
                          <Input
                            value={award.name || ''}
                            onChange={(e) => updateArrayItem('awards', index, 'name', e.target.value)}
                            placeholder="Enter award name"
                            className="mt-1"
                          />
                        </div>
                        {/* Organization */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Organization <span className="text-red-500">*</span></label>
                          <Input
                            value={award.organization || ''}
                            onChange={(e) => updateArrayItem('awards', index, 'organization', e.target.value)}
                            placeholder="Enter organization or issuer"
                            className="mt-1"
                          />
                        </div>
                        {/* Month/Year */}
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Month/Year <span className="text-red-500">*</span></label>
                          <div className="flex gap-2 mt-1">
                            <select
                              value={awardDate.month}
                              onChange={(e) => updateArrayItem('awards', index, 'date', `${e.target.value}/${awardDate.year || new Date().getFullYear()}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Month</option>
                              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                              value={awardDate.year}
                              onChange={(e) => updateArrayItem('awards', index, 'date', `${awardDate.month || '01'}/${e.target.value}`)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Year</option>
                              {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* Description */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium">Description</label>
                          <Textarea
                            value={award.description || ''}
                            onChange={(e) => updateArrayItem('awards', index, 'description', e.target.value)}
                            placeholder="Describe what you achieved and why you received this award..."
                            className="mt-1 min-h-[80px]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Add Award Button */}
                <button
                  type="button"
                  onClick={() => addArrayItem('awards', { name: '', organization: '', date: '', description: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <FiPlus className="w-4 h-4" /> Add Award
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm italic mb-3">No awards found</p>
                <button
                  type="button"
                  onClick={() => addArrayItem('awards', { name: '', organization: '', date: '', description: '' })}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mx-auto"
                >
                  <FiPlus className="w-4 h-4" /> Add Award
                </button>
              </div>
            )}
          </CollapsibleSection>
          </div>

          {/* CV Preview Panel */}
          {showCVPreview && cvUrl && (
            <div className="w-1/2 border-l border-gray-200 pl-4">
              <div className="sticky top-0 bg-white pb-2 mb-2 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Original CV Preview
                </h3>
              </div>
              <div className="h-[calc(90vh-220px)] overflow-hidden rounded-lg border border-gray-200">
                <iframe
                  src={`${cvUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-full"
                  title="CV Preview"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Saving...' : 'Confirm & Sync to Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
