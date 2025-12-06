import { Plus, ChevronDown, ChevronUp } from "lucide-react";

interface SectionCompletion {
    workExperience: { count: number; maxCount: number }; // max 3
    education: { hasAny: boolean };
    skills: { totalCount: number; maxCount: number }; // max 10 total skills
    certificates: { hasAny: boolean };
    awards: { hasAny: boolean };
}

interface ProfileStrengthSidebarProps {
    profileCompletion: number;
    expandedSections: string[];
    onToggleSection: (section: string) => void;
    onPreviewClick?: () => void;
    sectionCompletion?: SectionCompletion;
    // Dialog open handlers
    onAddWorkExperience?: () => void;
    onAddEducation?: () => void;
    onAddSkills?: () => void;
    onAddCertificates?: () => void;
    onAddAwards?: () => void;
}

// Helper function to get status message based on completion percentage
const getStatusMessage = (completion: number) => {
    if (completion >= 70) {
        return {
            title: "Great!",
            description: "Your profile is strong enough to generate a CV tailored for IT professionals.",
            actionLabel: "What you can improve",
        };
    } else if (completion >= 40) {
        return {
            title: "Almost there!",
            description: "Complete your profile to at least 70% to generate your CV template.",
            actionLabel: "What you should add",
        };
    } else {
        return {
            title: "Let's get started!",
            description: "Your profile is still in early stage. Add more information to unlock CV generation.",
            actionLabel: "What you should add",
        };
    }
};

// Helper function to get progress circle color based on completion
const getProgressColor = (completion: number) => {
    if (completion >= 100) {
        return { start: "#16a34a", end: "#22c55e" }; // green-600 to green-500
    } else if (completion >= 70) {
        return { start: "#163988", end: "#3b82f6" }; // blue
    } else if (completion >= 40) {
        return { start: "#d97706", end: "#fbbf24" }; // amber-600 to amber-400
    } else {
        return { start: "#6b7280", end: "#9ca3af" }; // gray
    }
};

export default function ProfileStrengthSidebar({
    profileCompletion,
    expandedSections,
    onToggleSection,
    onPreviewClick,
    sectionCompletion,
    onAddWorkExperience,
    onAddEducation,
    onAddSkills,
    onAddCertificates,
    onAddAwards
}: ProfileStrengthSidebarProps) {
    const statusInfo = getStatusMessage(profileCompletion);
    const isEligible = profileCompletion >= 70;
    const progressColor = getProgressColor(profileCompletion);

    // Calculate which sections are incomplete
    const incompleteSections = {
        workExperience: !sectionCompletion || sectionCompletion.workExperience.count < sectionCompletion.workExperience.maxCount,
        education: !sectionCompletion || !sectionCompletion.education.hasAny,
        skills: !sectionCompletion || sectionCompletion.skills.totalCount < sectionCompletion.skills.maxCount,
        certificates: !sectionCompletion || !sectionCompletion.certificates.hasAny,
        awards: !sectionCompletion || !sectionCompletion.awards.hasAny
    };

    // Primary items to show (collapsed)
    const primaryItems = [
        { key: 'workExperience', label: 'Add Work Experience', onClick: onAddWorkExperience, show: incompleteSections.workExperience },
        { key: 'education', label: 'Add Education', onClick: onAddEducation, show: incompleteSections.education },
        { key: 'skills', label: 'Add Skills', onClick: onAddSkills, show: incompleteSections.skills },
    ].filter(item => item.show);

    // Secondary items (expanded)
    const secondaryItems = [
        { key: 'certificates', label: 'Add Certificates', onClick: onAddCertificates, show: incompleteSections.certificates },
        { key: 'awards', label: 'Add Awards', onClick: onAddAwards, show: incompleteSections.awards },
    ].filter(item => item.show);

    const isExpanded = expandedSections.includes("more");
    const hasSecondaryItems = secondaryItems.length > 0;

    return (
        <aside className="hidden xl:block space-y-6 sticky [top:calc(var(--sticky-offset)+var(--content-pad))] self-start transition-all duration-300">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-5">
                    Profile Strength
                </h3>

                {/* Progress Circle with Dynamic Color */}
                <div className="flex justify-center mb-6">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <defs>
                                <linearGradient
                                    id="progressGradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="0%"
                                    y2="100%"
                                >
                                    <stop offset="0%" stopColor={progressColor.start} />
                                    <stop offset="100%" stopColor={progressColor.end} />
                                </linearGradient>
                            </defs>

                            {/* Background Circle */}
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#eeeeee"
                                strokeWidth="3"
                            />

                            {/* Progress Circle */}
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="url(#progressGradient)"
                                strokeWidth="3"
                                strokeDasharray={`${profileCompletion}, 100`}
                            />
                        </svg>

                        {/* Text Center */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                            <div className={`text-2xl font-bold ${profileCompletion >= 100 ? "text-green-600" :
                                    profileCompletion >= 70 ? "text-blue-600" :
                                        profileCompletion >= 40 ? "text-amber-600" : "text-gray-600"
                                }`}>
                                {profileCompletion}%
                            </div>
                            <div className="text-xs text-gray-500">completed</div>
                        </div>
                    </div>
                </div>

                {/* Status Message Box */}
                <div className={`rounded-lg p-4 mb-6 ${isEligible ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
                    <p className={`text-sm font-semibold mb-1 ${isEligible ? "text-green-700" : "text-gray-700"}`}>
                        {statusInfo.title}
                    </p>
                    <p className={`text-sm ${isEligible ? "text-green-600" : "text-gray-600"}`}>
                        {statusInfo.description}
                    </p>
                </div>

                {/* Action Items Section */}
                {(primaryItems.length > 0 || hasSecondaryItems) && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">
                            {statusInfo.actionLabel}
                        </p>

                        {/* Primary Items */}
                        {primaryItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={item.onClick}
                                className="w-full text-left flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{item.label}</span>
                            </button>
                        ))}

                        {/* Secondary Items (when expanded) */}
                        {isExpanded && secondaryItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={item.onClick}
                                className="w-full text-left flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{item.label}</span>
                            </button>
                        ))}

                        {/* Show More/Less Toggle - Always at bottom */}
                        {hasSecondaryItems && (
                            <button
                                onClick={() => onToggleSection("more")}
                                className="w-full flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors text-sm"
                            >
                                {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                                <span>{isExpanded ? "Show less" : "Add more information"}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Primary Action Button */}
                <div className="pt-4">
                    {isEligible ? (
                        <button
                            onClick={onPreviewClick}
                            className="w-full py-3 bg-gradient-to-r from-[#3a4660] to-gray-400 text-white font-medium rounded-lg hover:from-[#3a4660] hover:to-[#3a4660] transition-all duration-200"
                        >
                            Preview & Download CV
                        </button>
                    ) : (
                        <div className="relative group">
                            <button
                                disabled
                                className="w-full py-3 bg-gray-500 text-white font-medium rounded-lg cursor-not-allowed opacity-70"
                            >
                                Your profile is not ready
                            </button>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                Complete at least 70% of your profile to generate your CV
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
