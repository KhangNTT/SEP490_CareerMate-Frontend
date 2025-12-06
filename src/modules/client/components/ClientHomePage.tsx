"use client";

import { TopEmployers } from "./TopEmployers";
import { FeedbackButton } from "./FeedbackButton";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  MapPin, 
  Building2,
  BookOpen,
  Users,
  Quote,
  Calendar
} from "lucide-react";
import { publicBlogApi } from "@/lib/public-blog-api";
import { fetchCompanies, type CompanyListItem } from "@/lib/company-api";
import type { BlogResponse } from "@/types/blog";

// Mock data for user reviews (only this remains mock)
const USER_REVIEWS = [
  {
    id: 1,
    name: "Nguyen Van A",
    role: "Software Engineer at FPT",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    rating: 5,
    review: "CareerMate helped me land my dream job in just 2 weeks! The AI matching feature is incredibly accurate and saved me hours of searching.",
  },
  {
    id: 2,
    name: "Tran Thi B",
    role: "Product Manager at Shopee",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    rating: 5,
    review: "The CV analysis tool gave me insights I never thought of. After optimizing my resume, I got 3x more interview callbacks!",
  },
  {
    id: 3,
    name: "Le Minh C",
    role: "Data Scientist at VNG",
    avatar: "https://randomuser.me/api/portraits/men/67.jpg",
    rating: 4,
    review: "Great platform with quality job listings. The career insights feature helped me understand market trends and negotiate better.",
  },
  {
    id: 4,
    name: "Pham Hong D",
    role: "UI/UX Designer at Grab",
    avatar: "https://randomuser.me/api/portraits/women/28.jpg",
    rating: 5,
    review: "I love how easy it is to find remote opportunities. CareerMate's smart filtering saved me so much time in my job search.",
  },
  {
    id: 5,
    name: "Hoang Van E",
    role: "DevOps Engineer at Momo",
    avatar: "https://randomuser.me/api/portraits/men/52.jpg",
    rating: 5,
    review: "The interview preparation resources are top-notch. I felt so much more confident going into my interviews.",
  },
];

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, suffix = "" }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime;
    const startCount = 0;
    const endCount = end;

    const updateCount = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(
        startCount + (endCount - startCount) * easeOutQuart
      );

      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };

    requestAnimationFrame(updateCount);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref} className="text-4xl md:text-5xl font-bold text-gray-600">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// Review Carousel Component
function ReviewCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % USER_REVIEWS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + USER_REVIEWS.length) % USER_REVIEWS.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % USER_REVIEWS.length);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {USER_REVIEWS.map((review) => (
            <div key={review.id} className="w-full flex-shrink-0 px-4">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 max-w-3xl mx-auto">
                <Quote className="h-10 w-10 text-blue-100 mb-4" />
                <p className="text-gray-700 text-lg mb-6 italic leading-relaxed">
                  "{review.review}"
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={review.avatar}
                    alt={review.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-100"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&background=3b82f6&color=fff`;
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{review.name}</h4>
                    <p className="text-gray-500 text-sm">{review.role}</p>
                  </div>
                  {renderStars(review.rating)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={goToPrevious}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
      >
        <ChevronLeft className="h-6 w-6 text-gray-600" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
      >
        <ChevronRight className="h-6 w-6 text-gray-600" />
      </button>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-6">
        {USER_REVIEWS.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setIsAutoPlaying(false);
              setCurrentIndex(index);
            }}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Generate mock rating for companies (will be replaced with real data later)
const getMockRating = (companyId: number) => {
  const seed = companyId * 17;
  const rating = 3.5 + (seed % 15) / 10;
  const reviewCount = 50 + (seed % 200);
  return { rating: Math.min(rating, 5).toFixed(1), reviewCount };
};

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

// Estimate read time based on content length
const estimateReadTime = (content: string) => {
  const wordsPerMinute = 200;
  const wordCount = content?.split(/\s+/).length || 0;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${Math.max(1, minutes)} min read`;
};

export function ClientHomePage() {
  // State for fetching real data
  const [blogs, setBlogs] = useState<BlogResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  // Fetch blogs on mount
  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setIsLoadingBlogs(true);
        const response = await publicBlogApi.getBlogs({ page: 0, size: 3, sortBy: 'createdAt', sortDir: 'DESC' });
        setBlogs(response.content || []);
      } catch (error) {
        console.error('Error loading blogs:', error);
      } finally {
        setIsLoadingBlogs(false);
      }
    };
    loadBlogs();
  }, []);

  // Fetch companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setIsLoadingCompanies(true);
        const response = await fetchCompanies({ page: 0, size: 4 });
        if (response.code === 200 || response.code === 1000) {
          setCompanies(response.result?.content || []);
        }
      } catch (error) {
        console.error('Error loading companies:', error);
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    loadCompanies();
  }, []);
  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        select {
          direction: ltr !important;
        }
        select option {
          direction: ltr !important;
        }
      `}</style>

      
        {/* Added margin-top equal to header height */}
        {/* Hero Section */}
        <section 
          className="relative text-white py-20 pb-32 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/general/job-search-bg.png')" }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/60"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Welcome to CareerMate
            </h1>
            <h2 className="text-xl md:text-3xl mb-12 text-blue-100 max-w-3xl mx-auto">
              The bridge between opportunity and success.
            </h2>

            {/* Search Bar */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-[2]">
                    <input
                      type="text"
                      placeholder="Job title, keywords, or company"
                      className="w-full px-6 py-4 rounded-xl text-gray-900 placeholder-gray-500 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-xl transition-all"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <select
                      className="w-full px-6 py-4 pr-12 rounded-xl text-gray-900 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-xl transition-all appearance-none cursor-pointer"
                      style={{ direction: "ltr" }}
                    >
                      <option value="">Select Location</option>
                      <option value="remote">Remote</option>
                      <option value="new-york">New York, NY</option>
                      <option value="san-francisco">San Francisco, CA</option>
                      <option value="seattle">Seattle, WA</option>
                      <option value="austin">Austin, TX</option>
                      <option value="boston">Boston, MA</option>
                      <option value="chicago">Chicago, IL</option>
                      <option value="denver">Denver, CO</option>
                      <option value="los-angeles">Los Angeles, CA</option>
                      <option value="miami">Miami, FL</option>
                      <option value="phoenix">Phoenix, AZ</option>
                      <option value="portland">Portland, OR</option>
                      <option value="san-diego">San Diego, CA</option>
                      <option value="washington-dc">Washington, DC</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <svg
                        className="w-5 h-5 text-gray-400"
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
                  </div>
                  <button className="px-8 py-4 font-semibold shadow-lg hover:shadow-xl bg-gradient-to-r from-[#3a4660] to-gray-400 text-white rounded-md hover:bg-gradient-to-r hover:from-[#3a4660] hover:to-[#3a4660] transition-colors">
                    Search
                  </button>
                </div>

                {/* Quick Filters */}
                <div
                  className="mt-6 flex flex-wrap justify-center gap-3 items-center"
                >
                  <span className="font-bold text-base text-white">
                    Suggestions for you:
                  </span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm text-white/90 hover:bg-white/30 transition-colors cursor-pointer">
                    Software Engineer
                  </span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm text-white/90 hover:bg-white/30 transition-colors cursor-pointer">
                    IT Comtor
                  </span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm text-white/90 hover:bg-white/30 transition-colors cursor-pointer">
                    Companies
                  </span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm text-white/90 hover:bg-white/30 transition-colors cursor-pointer">
                    Skills
                  </span>
                  
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div className="group">
                <div className="mb-2">
                  <AnimatedCounter end={10000} suffix="+" duration={2500} />
                </div>
                <div className="text-gray-600 text-lg font-sans">
                  Active Jobs
                </div>
              </div>
              <div className="group">
                <div className="mb-2">
                  <AnimatedCounter end={500} suffix="+" duration={2000} />
                </div>
                <div className="text-gray-600 text-lg font-sans">
                  Top Companies
                </div>
              </div>
              <div className="group">
                <div className="mb-2">
                  <AnimatedCounter end={50000} suffix="+" duration={3000} />
                </div>
                <div className="text-gray-600 text-lg font-sans">
                  Candidates
                </div>
              </div>
              <div className="group">
                <div className="mb-2">
                  <AnimatedCounter end={95} suffix="%" duration={1500} />
                </div>
                <div className="text-gray-600 text-lg font-sans">
                  Success Rate
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Top Employers Section */}
        <TopEmployers />

        {/* Hot Companies Section */}
        <section className="py-16 bg-gradient-to-br from-gray-900 to-indigo-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-8 w-8 text-blue-400" />
                  <h2 className="text-3xl font-bold text-white">
                    Hot Companies
                  </h2>
                </div>
                <p className="text-gray-300 text-lg">
                  Top-rated companies actively hiring
                </p>
              </div>
              <Link 
                href="/companies"
                className="px-6 py-3 bg-white/10 backdrop-blur text-white rounded-lg font-semibold hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20"
              >
                Explore Companies
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>

            {isLoadingCompanies ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white/10 rounded-xl border border-white/20 p-6 animate-pulse">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl bg-white/20 mb-4" />
                      <div className="h-5 w-32 bg-white/20 rounded mb-2" />
                      <div className="h-4 w-24 bg-white/20 rounded mb-3" />
                      <div className="h-4 w-28 bg-white/20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : companies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {companies.map((company) => {
                  const { rating, reviewCount } = getMockRating(company.id);
                  return (
                    <Link
                      key={company.id}
                      href={`/companies/${company.id}`}
                      className="group bg-white/10 backdrop-blur rounded-xl border border-white/20 p-6 hover:bg-white/20 hover:border-blue-400/50 transition-all duration-300"
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center overflow-hidden mb-4 shadow-lg">
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.companyName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Building2 className={`h-10 w-10 text-gray-400 ${company.logoUrl ? 'hidden' : ''}`} />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">
                          {company.companyName}
                        </h3>
                        <p className="text-gray-400 text-sm mb-3 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{company.companyAddress || 'Vietnam'}</span>
                        </p>
                        
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(parseFloat(rating))
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-white font-semibold">{rating}</span>
                          <span className="text-gray-400 text-sm">({reviewCount})</span>
                        </div>

                        <div className="flex items-center gap-2 text-blue-400">
                          <Briefcase className="h-4 w-4" />
                          <span className="font-semibold">{company.jobCount} open jobs</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No companies available at the moment.</p>
              </div>
            )}
          </div>
        </section>

        {/* Career Insights Blog Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <h2 className="text-3xl font-bold text-gray-900">
                    Career Insights
                  </h2>
                </div>
                <p className="text-gray-600 text-lg">
                  Expert tips and guides for your career journey
                </p>
              </div>
              <Link 
                href="/blog"
                className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                Read More Articles
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>

            {isLoadingBlogs ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                    <div className="h-48 bg-gray-200" />
                    <div className="p-6">
                      <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
                      <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-2/3 bg-gray-200 rounded mb-4" />
                      <div className="h-4 w-1/2 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : blogs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {blogs.map((blog) => (
                  <Link
                    key={blog.id}
                    href={`/blog/${blog.id}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
                  >
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      {blog.thumbnailUrl ? (
                        <img
                          src={blog.thumbnailUrl}
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                          <BookOpen className="h-16 w-16 text-blue-300" />
                        </div>
                      )}
                      {blog.category && (
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                            {blog.category}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {blog.title}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                        {blog.summary || blog.content?.substring(0, 120) + '...'}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{blog.authorName || 'CareerMate'}</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(blog.createdAt)}
                          </span>
                          <span>•</span>
                          <span>{estimateReadTime(blog.content || '')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No articles available at the moment.</p>
              </div>
            )}
          </div>
        </section>

        {/* User Reviews Carousel */}
        <section className="py-16 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Users className="h-8 w-8 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">
                  What Our Users Say
                </h2>
              </div>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Join thousands of professionals who found their dream careers with CareerMate
              </p>
            </div>

            <ReviewCarousel />
          </div>
        </section>

        {/* AI Features Section */}
        <section className="py-16 bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                AI-Powered Features
              </h2>
              <p className="text-xl text-gray-600">
                Get personalized job recommendations and career insights
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Smart Matching</h3>
                <p className="text-gray-600">
                  Our AI analyzes your skills and preferences to find the
                  perfect job matches.
                </p>
              </div>

              <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Career Insights</h3>
                <p className="text-gray-600">
                  Get personalized career advice and market insights to advance
                  your career.
                </p>
              </div>

              <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">CV Analysis</h3>
                <p className="text-gray-600">
                  Get your CV analyzed by AI to highlight strengths and suggest improvements.
                </p>
              </div>
            </div>
            
            <FeedbackButton />
          </div>
        </section>
      
    </div>
  );
}

export default ClientHomePage;
