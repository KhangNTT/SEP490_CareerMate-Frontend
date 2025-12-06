"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import JobCard from "../../../components/JobCard";
import JobRecommendModal from "../../../components/JobRecommendModal";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import { FiMapPin, FiSearch, FiX, FiStar } from "react-icons/fi";
import { IoFilterOutline } from "react-icons/io5";
import { AiFillStar, AiFillLike, AiOutlineLike } from "react-icons/ai";
import { HiOutlineDocumentSearch } from "react-icons/hi";
import { Lock } from "lucide-react";
import {
  fetchJobPostings,
  transformJobPosting,
  toggleSaveJob,
  toggleLikeJob,
  viewJob,
  fetchSavedJobs,
  fetchLikedJobs,
  type JobPosting,
} from "@/lib/job-api";
import { useAuthStore } from "@/store/use-auth-store";
import toast from "react-hot-toast";
import { JobCardSkeleton, JobDetailSkeleton } from "@/components/skeletons";
import { resumeService } from "@/services/resumeService";
import { analyzeCVATS } from "@/lib/cv-ats-api";
import { checkCVAnalyseAccess } from "@/lib/entitlement-api";
import api from "@/lib/api";

interface JobListing {
  id: number;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  postedAgo: string;
  jobType: string;
  workMode: string;
  experience: string;
  expertise: string;
  skills: string[];
  highlights: string[];
  description: string[];
  // NEW
  salaryRange?: string; // dải lương hiển thị chip + meta bar
  benefitSummary?: string[]; // tóm tắt 3–4 quyền lợi cho meta bar
  benefits?: string[]; // danh sách chi tiết cho block “Compensation & Benefits”
  isHot?: boolean;
  isNegotiable?: boolean;
  companyType?: string;
}

const jobs: JobListing[] = [
  {
    id: 1,
    title: "Senior IT Operators (Corebanking)",
    company: "VIBbank",
    location: "Hồ Chí Minh",
    workMode: "At office",
    postedAgo: "1 hour ago",
    jobType: "Full time",
    experience: "5+ years",
    expertise: "Core Banking & Support",
    skills: ["Java", "DevOps", "Linux", "Cloud", "SQL", "Oracle"],
    isHot: true,
    salaryRange: "45–70M VND gross",
    benefitSummary: [
      "13th + performance bonus",
      "Hybrid/On-call allowance",
      "Private health insurance",
      "15 days paid leave",
    ],
    benefits: [
      "Total rewards: 13th-month + performance bonus + on-call allowance",
      "Private health insurance (self) + annual health check",
      "Hybrid policy, flexible working hours",
      "15 days annual leave + company trips",
      "Certification budget (AWS/CKA/ITIL…) & internal training",
      "High-impact Core Banking environment (HA/DR, PCI-DSS)",
    ],
    highlights: [
      "People development",
      "High promotion opportunities",
      "Attractive salary package",
    ],
    description: [
      "Provide technical support to support teams and customers through SLAs.",
      "Troubleshoot and resolve incidents quickly, collaborating across departments.",
      "Maintain performance, integrity, and security of applications.",
      "Participate in project releases, ensuring requirements are met timely.",
      "Escalate and communicate emerging risks before they become major issues.",
    ],
  },
  {
    id: 2,
    title: "Frontend Developer",
    company: "NEXON DEV VNA",
    location: "Hà Nội",
    workMode: "Remote",
    postedAgo: "2 hours ago",
    jobType: "Full time",
    experience: "3+ years",
    expertise: "Frontend Development",
    skills: ["React", "JavaScript", "TypeScript", "CSS"],
    salaryRange: "35–55M VND gross",
    benefitSummary: [
      "Flexible hours",
      "Annual bonus",
      "Health insurance",
      "Remote-first",
    ],
    benefits: [
      "Annual performance bonus",
      "Private health insurance",
      "Remote-first policy & home office support",
      "Learning budget for courses/conferences",
    ],
    isHot: false,
    highlights: [
      "Work with latest technologies",
      "Flexible working hours",
      "International team collaboration",
    ],
    description: [
      "Develop modern web applications using React and TypeScript.",
      "Collaborate with UI/UX designers to implement pixel-perfect designs.",
      "Write clean, maintainable, and well-documented code.",
      "Participate in code reviews and contribute to team best practices.",
    ],
  },
  {
    id: 3,
    title: "Full Stack Developer",
    company: "MB Bank",
    location: "Đà Nẵng",
    workMode: "Hybrid",
    postedAgo: "3 hours ago",
    jobType: "Full time",
    experience: "4+ years",
    expertise: "Full Stack Development",
    skills: ["Python", "JavaScript", "MongoDB", "Docker"],
    isNegotiable: true,
    salaryRange: "Negotiable",
    benefitSummary: ["Hybrid", "Annual bonus", "Insurance", "Learning budget"],
    benefits: [
      "Competitive package with annual bonus",
      "Hybrid policy, allowance for WFH",
      "Private health insurance & health check",
      "Learning budget; clear promotion path",
    ],
    highlights: [
      "Competitive salary package",
      "Career development opportunities",
      "Modern tech stack",
    ],
    description: [
      "Build end-to-end web applications with modern frameworks.",
      "Design and implement RESTful APIs and microservices.",
      "Work with databases, cloud services, and DevOps practices.",
      "Mentor junior developers and lead technical discussions.",
    ],
  },
  {
    id: 4,
    title: "DevOps Engineer",
    company: "LG Electronics Development Vietnam",
    location: "Hồ Chí Minh",
    workMode: "At office",
    postedAgo: "4 hours ago",
    jobType: "Full time",
    experience: "5+ years",
    expertise: "DevOps & Infrastructure",
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD"],
    salaryRange: "50–80M VND gross",
    benefitSummary: ["Global benefits", "Bonus", "Insurance", "Growth path"],
    benefits: [
      "Global company benefits & annual bonus",
      "Private insurance for employee & family options",
      "Training & certification reimbursement",
      "Modern office, equipment provided",
    ],
    isHot: true,
    highlights: [
      "Work with cutting-edge technology",
      "Global company benefits",
      "Professional growth opportunities",
    ],
    description: [
      "Manage and optimize cloud infrastructure on AWS.",
      "Implement CI/CD pipelines and automation tools.",
      "Monitor system performance and ensure high availability.",
      "Collaborate with development teams on deployment strategies.",
    ],
  },
  {
    id: 5,
    title: "Backend Developer",
    company: "NAB Innovation Centre Vietnam",
    location: "Hồ Chí Minh",
    workMode: "At office",
    postedAgo: "5 hours ago",
    jobType: "Full time",
    experience: "3+ years",
    expertise: "Backend Development",
    skills: ["Node.js", "Java", "MongoDB", "AWS"],
    salaryRange: "Thỏa thuận",
    benefitSummary: ["Agile", "Bonus", "Insurance", "International exposure"],
    benefits: [
      "Annual performance bonus",
      "Private health insurance",
      "Agile environment & international teams",
      "Education stipend / certification support",
    ],
    isHot: false,
    highlights: [
      "Work in fintech environment",
      "Agile methodology",
      "International exposure",
    ],
    description: [
      "Develop robust backend services and APIs.",
      "Work with microservices architecture.",
      "Ensure code quality and system reliability.",
      "Participate in architecture design decisions.",
    ],
  },
];

export default function JobsDetailPage() {
  const router = useRouter();
  const { isAuthenticated, candidateId, fetchCandidateProfile } =
    useAuthStore();

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // ✅ Use maps to track saved/liked status per job
  const [savedMap, setSavedMap] = useState<Record<number, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [searchLocation, setSearchLocation] = useState<string>("All Cities");
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showJobRecommendModal, setShowJobRecommendModal] = useState<boolean>(false);
  const [showNoCVModal, setShowNoCVModal] = useState<boolean>(false);
  const [showCVAnalyseUpgradeModal, setShowCVAnalyseUpgradeModal] = useState<boolean>(false);
  const [hasCVAnalyseAccess, setHasCVAnalyseAccess] = useState<boolean | null>(null);
  const [checkingCVAnalyseAccess, setCheckingCVAnalyseAccess] = useState<boolean>(false);

  // ✅ Fetch candidateId if authenticated but missing
  useEffect(() => {
    if (isAuthenticated && !candidateId) {
      console.log("📝 Candidate ID missing, fetching user profile...");
      fetchCandidateProfile().catch((err) => {
        console.error("❌ Failed to fetch candidate profile:", err);
      });
    }
  }, [isAuthenticated, candidateId, fetchCandidateProfile]);
  const jobsPerPage = 10;

  // Fetch jobs from API
  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        const response = await fetchJobPostings({
          keyword: searchKeyword,
          page: currentPage,
          size: jobsPerPage,
          sortBy: "createAt",
          sortDir: "desc",
        });

        if (response.code === 200 && response.result.content) {
          const transformedJobs =
            response.result.content.map(transformJobPosting);
          setJobs(transformedJobs);
          setTotalPages(response.result.totalPages);
          setTotalElements(response.result.totalElements);

          // Select first job if none selected
          if (!selectedJobId && transformedJobs.length > 0) {
            setSelectedJobId(transformedJobs[0].id);
          }
        }
      } catch (err) {
        setError("Failed to load job postings");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [currentPage, searchKeyword]);

  // ✅ Fetch saved and liked jobs when authenticated
  useEffect(() => {
    const loadSavedAndLikedJobs = async () => {
      if (!isAuthenticated || !candidateId) return;

      try {
        // Fetch saved jobs
        const savedJobs = await fetchSavedJobs(candidateId);
        const savedJobIds = savedJobs.reduce((acc, job) => {
          acc[job.jobId] = true;
          return acc;
        }, {} as Record<number, boolean>);
        setSavedMap(savedJobIds);

        // Fetch liked jobs
        const likedJobs = await fetchLikedJobs(candidateId);
        const likedJobIds = likedJobs.reduce((acc, job) => {
          acc[job.jobId] = true;
          return acc;
        }, {} as Record<number, boolean>);
        setLikedMap(likedJobIds);

        console.log('✅ Loaded saved/liked jobs:', { savedJobIds, likedJobIds });
      } catch (error) {
        console.error('❌ Error loading saved/liked jobs:', error);
      }
    };

    loadSavedAndLikedJobs();
  }, [isAuthenticated, candidateId]);

  // ✅ Memoize selectedJob to avoid recalculation on every render
  const selectedJob = useMemo(() =>
    jobs.find((job) => job.id === selectedJobId) || jobs[0],
    [jobs, selectedJobId]
  );

  // ✅ Memoize computed values for current job's saved/liked status
  const isBookmarked = useMemo(() =>
    selectedJobId ? (savedMap[selectedJobId] ?? false) : false,
    [selectedJobId, savedMap]
  );

  const isLiked = useMemo(() =>
    selectedJobId ? (likedMap[selectedJobId] ?? false) : false,
    [selectedJobId, likedMap]
  );

  // ✅ Memoize handlers with useCallback
  const handleJobSelect = useCallback((jobId: number) => {
    setSelectedJobId(jobId);

    // Track job view
    if (candidateId) {
      viewJob(candidateId, jobId).catch((err) => {
        console.error("Failed to track job view:", err);
      });
    }
  }, [candidateId]);

  const handleApplyNow = useCallback(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    // Navigate directly to the apply page (skip redirect stub)
    router.push(`/jobs-detail/${selectedJobId}/apply`);
  }, [isAuthenticated, selectedJobId, router]);

  // Handler for CV Analyse button
  const handleCVAnalyse = useCallback(async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    if (!selectedJobId) {
      toast.error("Please select a job first");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Check subscription access first
      setCheckingCVAnalyseAccess(true);
      const accessRes = await checkCVAnalyseAccess();
      setCheckingCVAnalyseAccess(false);
      setHasCVAnalyseAccess(accessRes.hasAccess);

      if (!accessRes.hasAccess) {
        setIsAnalyzing(false);
        setShowCVAnalyseUpgradeModal(true);
        return;
      }

      // 1. Fetch default/active CV
      const activeResume = await resumeService.getActiveResume();

      if (!activeResume || !activeResume.resumeUrl) {
        setIsAnalyzing(false);
        setShowNoCVModal(true);
        return;
      }

      // 2. Fetch job detail from API
      const jobResponse = await api.get(`/api/job-postings/${selectedJobId}`);
      const jobData = jobResponse.data?.result;

      if (!jobData) {
        toast.error("Failed to fetch job details");
        return;
      }

      // 3. Build job description from job data
      const skillsList = jobData.skills?.map((s: any) =>
        `${s.name}${s.mustToHave ? ' (Required)' : ''}`
      ).join(', ') || '';

      const jobDescription = `
Job Title: ${jobData.title}
Company: ${jobData.recruiterInfo?.companyName || 'N/A'}
Location: ${jobData.address}
Work Model: ${jobData.workModel}
Salary: ${jobData.salaryRange}
Years of Experience Required: ${jobData.yearsOfExperience} years

Job Description:
${jobData.description}

Required Skills:
${skillsList}

About Company:
${jobData.recruiterInfo?.about || 'N/A'}
      `.trim();

      // 4. Fetch CV file from URL
      toast.loading("Fetching your CV...");
      const cvResponse = await fetch(activeResume.resumeUrl);
      if (!cvResponse.ok) {
        throw new Error("Failed to fetch CV file");
      }

      const cvBlob = await cvResponse.blob();
      // Extract filename from URL or use default
      const urlParts = activeResume.resumeUrl.split('/');
      const fileName = urlParts[urlParts.length - 1]?.split('?')[0] || "cv.pdf";
      const cvFile = new File([cvBlob], fileName, {
        type: cvBlob.type || "application/pdf"
      });

      // 5. Call ATS analysis API
      toast.dismiss();
      toast.loading("Analyzing your CV against this job...");

      const result = await analyzeCVATS(jobDescription, cvFile);

      // 6. Store result and navigate
      sessionStorage.setItem("cv_ats_result", JSON.stringify(result));

      toast.dismiss();
      toast.success("CV analysis completed!");
      router.push("/candidate/ai-cv-result");

    } catch (error: any) {
      console.error("Error analyzing CV:", error);
      toast.dismiss();
      toast.error(error.message || "Failed to analyze CV. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAuthenticated, selectedJobId, router]);

  const handleToggleSave = useCallback(async () => {
    // Check authentication
    if (!isAuthenticated) {
      toast.error("Please login to save jobs");
      setShowLoginModal(true);
      return;
    }

    // Check candidateId
    if (!candidateId) {
      toast.error("Candidate ID not found. Please login again.");
      return;
    }

    // Check job ID
    if (!selectedJobId) {
      toast.error("No job selected");
      return;
    }

    const currentlySaved = savedMap[selectedJobId] ?? false;

    setIsSaving(true);
    try {
      const newSavedStatus = await toggleSaveJob(
        candidateId,
        selectedJobId,
        currentlySaved
      );
      // ✅ Update the map for this specific job
      setSavedMap(prev => ({ ...prev, [selectedJobId]: newSavedStatus }));

      if (newSavedStatus) {
        toast.success("Job saved successfully! 💾");
      } else {
        toast.success("Job unsaved");
      }
    } catch (error: any) {
      console.error("Error toggling save status:", error);
      toast.error(
        error?.response?.data?.message ||
        "Failed to save job. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated, candidateId, selectedJobId, savedMap]);

  const handleToggleLike = useCallback(async () => {
    // Check authentication
    if (!isAuthenticated) {
      toast.error("Please login to like jobs");
      setShowLoginModal(true);
      return;
    }

    // Check candidateId
    if (!candidateId) {
      toast.error("Candidate ID not found. Please login again.");
      return;
    }

    // Check job ID
    if (!selectedJobId) {
      toast.error("No job selected");
      return;
    }

    const currentlyLiked = likedMap[selectedJobId] ?? false;

    setIsLiking(true);
    try {
      const newLikedStatus = await toggleLikeJob(
        candidateId,
        selectedJobId,
        currentlyLiked
      );
      // ✅ Update the map for this specific job
      setLikedMap(prev => ({ ...prev, [selectedJobId]: newLikedStatus }));

      if (newLikedStatus) {
        toast.success("You like this job! 👍");
      } else {
        toast.success("Job unliked");
      }
    } catch (error: any) {
      console.error("Error toggling like status:", error);
      toast.error(
        error?.response?.data?.message ||
        "Failed to like job. Please try again."
      );
    } finally {
      setIsLiking(false);
    }
  }, [isAuthenticated, candidateId, selectedJobId, likedMap]);

  const handleLoginRedirect = useCallback(() => {
    setShowLoginModal(false);
    // Save the intended destination to localStorage
    if (selectedJobId) {
      localStorage.setItem('redirectAfterLogin', `/jobs-detail/${selectedJobId}/apply`);
    }
    router.push("/sign-in");
  }, [selectedJobId, router]);

  const handleSearch = useCallback(() => {
    console.log("🔍 Searching for:", searchKeyword);
    setCurrentPage(0); // Reset to first page on search
    // The useEffect will automatically re-fetch with the new keyword
  }, [searchKeyword]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const clearSearch = useCallback(() => {
    setSearchKeyword("");
    setCurrentPage(0); // Reset page when clearing search
  }, []);

  return (
    <>
      <div className="min-h-screen bg-gray-50 pt-16">
        {/* Search Bar Section */}
        <div className="py-3 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Location Dropdown */}
                <div className="relative flex-shrink-0">
                  <select
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="appearance-none w-full md:w-64 pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white cursor-pointer text-gray-700"
                  >
                    git add src/app/(home)/jobs-detail/page.tsx
                    <option value="Ho Chi Minh">Ho Chi Minh</option>
                    <option value="Ha Noi">Ha Noi</option>
                    <option value="Da Nang">Da Nang</option>
                  </select>
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {/* Search Input */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Fullstack Developer"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  {searchKeyword && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  className="hover:shadow-xl bg-gradient-to-r from-[#3a4660] to-gray-400 hover:bg-gradient-to-r hover:from-[#3a4660] hover:to-[#3a4660] transition-colors text-white px-8 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors flex-shrink-0"
                >
                  <FiSearch className="w-5 h-5" />
                  Search
                </button>
              </div>

              {/* Filter Bar - Compact Design */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                {/* Level Dropdown */}
                <div className="relative">
                  <select className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white cursor-pointer text-gray-700 text-sm font-medium transition-colors">
                    <option>Level</option>
                    <option>Intern</option>
                    <option>Fresher</option>
                    <option>Junior</option>
                    <option>Middle</option>
                    <option>Senior</option>
                    <option>Leader</option>
                  </select>
                  <svg
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Working Model Dropdown */}
                <div className="relative">
                  <select className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white cursor-pointer text-gray-700 text-sm font-medium transition-colors">
                    <option>Work Mode</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>Onsite</option>
                  </select>
                  <svg
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Salary Dropdown */}
                <div className="relative">
                  <select className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white cursor-pointer text-gray-700 text-sm font-medium transition-colors">
                    <option>Salary</option>
                    <option>Dưới 10 triệu</option>
                    <option>10-15 triệu</option>
                    <option>15-20 triệu</option>
                    <option>20-30 triệu</option>
                    <option>30-50 triệu</option>
                    <option>Trên 50 triệu</option>
                  </select>
                  <svg
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Job Domain Dropdown */}
                <div className="relative">
                  <select className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white cursor-pointer text-gray-700 text-sm font-medium transition-colors">
                    <option>Domain</option>
                    <option>Backend</option>
                    <option>Frontend</option>
                    <option>Fullstack</option>
                    <option>Mobile</option>
                    <option>DevOps</option>
                    <option>AI/ML</option>
                    <option>Data Science</option>
                  </select>
                  <svg
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Clear Filters Button */}
                <button className="ml-auto flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm">
                  <FiX className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-4">
          <main className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <aside className="lg:col-span-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
                  {/* Header Section: Title + Job Recommend Button */}
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">
                      Available Jobs{" "}
                      <span className="text-blue-600 font-semibold">({totalElements})</span>
                    </h2>

                    <button
                      onClick={() => setShowJobRecommendModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 rounded-lg text-sm font-medium transition-all duration-200"
                    >
                      {/* Icon Sparkles */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Job Recommend
                    </button>
                  </div>

                  {loading ? (
                    <JobCardSkeleton count={5} />
                  ) : error ? (
                    <div className="text-center py-12">
                      <p className="text-red-500 mb-4">{error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Retry
                      </button>
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No jobs found</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      <div className="space-y-4 pr-1">
                        {jobs.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => handleJobSelect(job.id)}
                            className="cursor-pointer"
                          >
                            <JobCard
                              id={job.id}
                              title={job.title}
                              company={job.company}
                              location={job.location}
                              postedAgo={job.postedAgo}
                              workMode={job.workMode}
                              skills={job.skills}
                              isHot={job.isHot}
                              isNegotiable={job.isNegotiable}
                              companyType={job.companyType}
                              isSelected={selectedJobId === job.id}
                              salaryRange={job.salaryRange}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-6 pt-6 border-t border-gray-200">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 0}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>

                          <div className="flex gap-2">
                            {Array.from(
                              { length: Math.min(totalPages, 5) },
                              (_, i) => {
                                let page;
                                if (totalPages <= 5) {
                                  page = i;
                                } else if (currentPage < 3) {
                                  page = i;
                                } else if (currentPage > totalPages - 3) {
                                  page = totalPages - 5 + i;
                                } else {
                                  page = currentPage - 2 + i;
                                }

                                return (
                                  <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`px-4 py-2 rounded-lg ${currentPage === page
                                      ? "bg-red-500 text-white"
                                      : "border border-gray-300 hover:bg-gray-50"
                                      }`}
                                  >
                                    {page + 1}
                                  </button>
                                );
                              }
                            )}
                          </div>
                         <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages - 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </aside>

              <section className="lg:col-span-7">
                {selectedJob ? (
                  <div className="lg:sticky lg:top-20 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden lg:max-h-[calc(100vh-6rem)]">
                    {/* Header with company and job title - Fixed */}
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-white to-slate-50">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-semibold">
                              {selectedJob.company}
                            </span>
                            <span className="text-sm text-gray-600">
                              ✓ You will love it
                            </span>
                          </div>
                          <h1 className="text-2xl font-bold text-gray-900 mb-3">
                            {selectedJob.title}
                          </h1>

                          {/* NEW: chips ngay dưới tiêu đề */}
                          <div className="flex flex-wrap gap-2.5 mb-4">
                            {selectedJob.salaryRange && (
                              <span className="salary-badge inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                                <RiMoneyDollarCircleLine size={18} />
                                {selectedJob.salaryRange}
                              </span>
                            )}
                            <span className="px-3.5 py-1.5 rounded-full text-sm font-medium bg-sky-50 text-sky-700 border border-sky-200">
                              {selectedJob.workMode}
                            </span>
                            <span className="px-3.5 py-1.5 rounded-full text-sm font-medium bg-violet-50 text-violet-700 border border-violet-200">
                              {selectedJob.jobType}
                            </span>
                          </div>

                          <p className="text-gray-500 text-sm flex items-center gap-1.5">
                            <svg
                              className="w-4 h-4 text-blue-600"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            {selectedJob.location} ·{" "}
                            <span className="text-blue-600">
                              {selectedJob.jobType}
                            </span>{" "}
                            · {selectedJob.postedAgo}
                          </p>
                        </div>

                        {/* CV Analyse Button - Top Right */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={handleCVAnalyse}
                            disabled={isAnalyzing}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAnalyzing ? (
                              <>
                                <span className="animate-spin">⏳</span>
                                <span>Analysing...</span>
                              </>
                            ) : (
                              <>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="w-4 h-4"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span>CV Analyse</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3 mb-4">
                        <button
                          onClick={handleApplyNow}
                          className="flex-1 bg-gradient-to-r from-[#3a4660] to-gray-400 text-white px-6 py-2 rounded-md font-medium hover:bg-gradient-to-r hover:from-[#3a4660] hover:to-[#3a4660] transition-colors"
                        >
                          Apply Now
                        </button>

                        {/* Like Button */}
                        <div className="relative group">
                          <button
                            onClick={handleToggleLike}
                            disabled={isLiking}
                            className={`p-3 border-2 rounded-md transition-colors ${isLiking
                              ? "border-gray-200 cursor-not-allowed opacity-50"
                              : isLiked
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-300 hover:border-blue-500"
                              }`}
                          >
                            {isLiked ? (
                              <AiFillLike className="w-6 h-6 text-blue-500" />
                            ) : (
                              <AiOutlineLike className="w-6 h-6 text-gray-600" />
                            )}
                          </button>

                          {/* Tooltip */}
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                            <div className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded whitespace-nowrap">
                              {isLiking
                                ? "Processing..."
                                : isLiked
                                  ? "Liked"
                                  : "You like this job"}
                            </div>
                            <div className="w-3 h-3 bg-gray-800 transform rotate-45 absolute -bottom-1 right-4"></div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="relative group">
                          <button
                            onClick={handleToggleSave}
                            disabled={isSaving}
                            className={`p-3 border-2 rounded-md transition-colors ${isSaving
                              ? "border-gray-200 cursor-not-allowed opacity-50"
                              : isBookmarked
                                ? "border-yellow-500 bg-yellow-50"
                                : "border-gray-300 hover:border-yellow-500"
                              }`}
                          >
                            {isBookmarked ? (
                              <AiFillStar className="w-6 h-6 text-yellow-500" />
                            ) : (
                              <FiStar className="w-6 h-6 text-gray-600" />
                            )}
                          </button>

                          {/* Tooltip */}
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                            <div className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded whitespace-nowrap">
                              {isSaving
                                ? "Saving..."
                                : isBookmarked
                                  ? "Saved"
                                  : "Save this job"}
                            </div>
                            <div className="w-3 h-3 bg-gray-800 transform rotate-45 absolute -bottom-1 right-4"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Content Area - scroll riêng trong card */}
                    <div
                      className="overflow-y-auto flex-1"
                      style={{ maxHeight: "calc(100vh - 22rem)" }}
                    >
                      <div className="p-6">
                        {/* NEW: meta bar tóm tắt compensation */}
                        {(selectedJob.salaryRange ||
                          selectedJob.benefitSummary?.length) && (
                            <div className="mb-6 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4 shadow-sm">
                              <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-800">
                                {selectedJob.salaryRange && (
                                  <li className="salary-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold shadow-md w-fit">
                                    <RiMoneyDollarCircleLine size={18} />
                                    {selectedJob.salaryRange}
                                  </li>
                                )}
                                {selectedJob.benefitSummary
                                  ?.slice(0, 3)
                                  .map((x, i) => (
                                    <li key={i}>• {x}</li>
                                  ))}
                              </ul>
                            </div>
                          )}

                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3">
                              Skills:
                            </h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {selectedJob.skills &&
                                selectedJob.skills.length > 0 ? (
                                selectedJob.skills.map((skill, index) => (
                                  <span
                                    key={index}
                                    className="px-4 py-1 bg-white border border-gray-300 text-gray-700 text-sm rounded-full shadow-sm"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-gray-500">
                                  No skills listed
                                </span>
                              )}
                            </div>

                            <h3 className="font-semibold text-gray-700 mb-3">
                              Job Expertise:
                            </h3>
                            <p className="text-sm text-gray-700 mb-4 ml-2">
                              {selectedJob.expertise}
                            </p>

                            <h3 className="font-semibold text-gray-700 mb-3">
                              Job Domain:
                            </h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                              <span className="px-4 py-1 bg-white border border-gray-300 text-gray-700 text-sm rounded-full shadow-sm">
                                {selectedJob.company}
                              </span>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold text-gray-900 mb-4">
                              Why you'll love working here
                            </h3>
                            <ul className="space-y-3 text-sm">
                              {selectedJob.highlights.map((item, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                                  <span className="text-gray-700">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* NEW: block Compensation & Benefits */}
                        {selectedJob.benefits &&
                          selectedJob.benefits.length > 0 && (
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900">
                                  Compensation & Benefits
                                </h3>
                              </div>
                              <ul className="space-y-2 text-sm text-gray-700">
                                {selectedJob.benefits.map((b, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></span>
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-semibold text-gray-900">
                              Job description
                            </h3>
                          </div>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            {selectedJob.description.map((item, index) => (
                              <p key={index} className="mb-3">
                                {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : loading ? (
                  <JobDetailSkeleton />
                ) : (
                  <div className="flex items-center justify-center">
                    <div className="text-center py-20">
                      <p className="text-gray-500 text-lg">
                        Select a job to view details
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </main>

          {/* Floating chat button */}
          <div
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-[#3a4660] to-gray-500 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 z-40"
          >
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
          </div>

          {/* CHAT BOX — đã xoá khe hở trắng, dùng 1 nền gradient + bỏ rounded lồng nhau */}
          {isChatOpen && (
            <div className="fixed bottom-6 right-6 z-50">
              <div className="rounded-2xl shadow-2xl w-96 h-[520px] flex flex-col overflow-hidden bg-gradient-to-b from-[#3a4660] via-gray-500 to-gray-400">
                {/* header trong suốt, không bo góc riêng */}
                <div className="p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
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
                            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold">Quiz Agent</h3>
                        <p className="text-sm text-white/80">
                          Practice for your interview
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="text-white hover:text-gray-200 transition-colors"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* content bg trong suốt, bỏ rounded để không hở mép */}
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="p-4">
                    <div className="bg-white/10 text-white rounded-lg p-3 mb-6 shadow-md">
                      <p className="text-sm font-medium mb-2">
                        Which CI/CD tool is commonly used for automating the
                        software delivery pipeline in DevOps?
                      </p>
                    </div>

                    <div className="space-y-4 mt-4">
                      <div className="flex items-center gap-3">
                        <button className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 focus:ring-2 focus:ring-offset-2 focus:ring-white/40 focus:outline-none">
                          <span className="text-sm">A</span>
                        </button>
                        <span className="text-sm text-white">Docker</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 focus:ring-2 focus:ring-offset-2 focus:ring-white/40 focus:outline-none">
                          <span className="text-sm">B</span>
                        </button>
                        <span className="text-sm text-white">Jenkins</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 focus:ring-2 focus:ring-offset-2 focus:ring-white/40 focus:outline-none">
                          <span className="text-sm">C</span>
                        </button>
                        <span className="text-sm text-white">Kubernetes</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 focus:ring-2 focus:ring-offset-2 focus:ring-white/40 focus:outline-none">
                          <span className="text-sm">D</span>
                        </button>
                        <span className="text-sm text-white">
                          Visual Studio
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* footer trong suốt + border mảnh, không bo riêng */}
                <div className="border-t border-white/10 p-3">
                  <div className="flex justify-between">
                    <button className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20">
                      Skip
                    </button>
                    <button className="px-4 py-2 bg-white text-[#3a4660] font-medium rounded-md hover:bg-gray-100">
                      Next Question
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
            {/* Close button */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>

            {/* Modal content */}
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Login is required
              </h2>
              <p className="text-gray-600 mb-6">Do you want to login?</p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLoginRedirect}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#3a4660] to-gray-400 text-white rounded-md hover:bg-gradient-to-r hover:from-[#3a4660] hover:to-[#3a4660] transition-colors"
                >
                  Continue to login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No CV Default Modal */}
      {showNoCVModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
            {/* Close button */}
            <button
              onClick={() => setShowNoCVModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>

            {/* Modal content */}
            <div className="p-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">
                No Default CV Attached
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                Currently you have no CV Default Attached. Would you like to attach new Default CV?
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNoCVModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowNoCVModal(false);
                    router.push("/candidate/cv-management");
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#3a4660] to-gray-400 text-white rounded-md hover:bg-gradient-to-r hover:from-[#3a4660] hover:to-[#3a4660] transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CV Analyse Upgrade Modal */}
      {showCVAnalyseUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
            {/* Close button */}
            <button
              onClick={() => setShowCVAnalyseUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>

            {/* Modal content */}
            <div className="p-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Lock className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">
                Upgrade Required
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                CV Analyse is a premium feature. Upgrade your subscription to unlock AI-powered CV analysis and get personalized feedback on how well your CV matches this job.
              </p>

              {/* Features list */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>AI-powered CV analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Match score with job requirements</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Personalized improvement suggestions</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCVAnalyseUpgradeModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowCVAnalyseUpgradeModal(false);
                    router.push("/candidate/subscription");
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Recommend Modal */}
      <JobRecommendModal
        isOpen={showJobRecommendModal}
        onClose={() => setShowJobRecommendModal(false)}
      />
    </>
  );
}
