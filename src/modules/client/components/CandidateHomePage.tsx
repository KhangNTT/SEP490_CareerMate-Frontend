"use client";

import { TopEmployers } from "./TopEmployers";
import { FeedbackButton } from "./FeedbackButton";
import { useState, useEffect, useRef } from "react";

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

export function CandidateHomePage() {
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
              Find Your Dream Job
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-blue-100 max-w-3xl mx-auto">
              AI-powered job matching for IT professionals. Discover
              opportunities that match your skills and career goals.
            </p>

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
                    Search Jobs
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
                    Remote
                  </span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm text-white/90 hover:bg-white/30 transition-colors cursor-pointer">
                    Full-time
                  </span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm text-white/90 hover:bg-white/30 transition-colors cursor-pointer">
                    Senior Level
                  </span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm text-white/90 hover:bg-white/30 transition-colors cursor-pointer">
                    AI/ML
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

export default CandidateHomePage;
