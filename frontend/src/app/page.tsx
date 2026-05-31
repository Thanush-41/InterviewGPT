"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "recruiter") router.replace("/recruiter/dashboard");
      else router.replace("/candidate/interviews");
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
              AI-Powered Interview Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                InterviewGPT
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Adaptive AI interviews that go beyond surface-level questions.
              Knowledge graph-powered assessment with real-time evaluation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-lg font-semibold hover:opacity-90 transition shadow-lg shadow-blue-500/25"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Recruiter Card */}
            <div className="p-8 rounded-2xl border bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900 space-y-6">
              <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold">For Recruiters</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  Upload candidate resumes (PDF)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  AI builds knowledge graph from resume
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  Start adaptive interviews per candidate
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  Live monitoring dashboard & malpractice detection
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  Multi-agent evaluation with authenticity scoring
                </li>
              </ul>
              <Link
                href="/signup?role=recruiter"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Join as Recruiter →
              </Link>
            </div>

            {/* Candidate Card */}
            <div className="p-8 rounded-2xl border bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-900 space-y-6">
              <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold">For Candidates</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">✓</span>
                  Take AI-powered technical interviews
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">✓</span>
                  Voice or text-based responses
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">✓</span>
                  Adaptive difficulty (easy → hard based on answers)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">✓</span>
                  Real-time feedback on each answer
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">✓</span>
                  View interview scores & detailed reports
                </li>
              </ul>
              <Link
                href="/signup?role=candidate"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
              >
                Join as Candidate →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-8">Powered By</h2>
          <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
            <span className="px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border shadow-sm font-medium">Gemini 2.5 Flash</span>
            <span className="px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border shadow-sm font-medium">LangGraph</span>
            <span className="px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border shadow-sm font-medium">MongoDB Atlas</span>
            <span className="px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border shadow-sm font-medium">FastAPI</span>
            <span className="px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border shadow-sm font-medium">Next.js 15</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Built with AI &bull; InterviewGPT &copy; 2026
        </div>
      </footer>
    </div>
  );
}
