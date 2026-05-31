"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CandidateInterviews() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "candidate")) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token || !user) return;
    // Fetch interviews for this candidate (by email match)
    fetch(`${API_URL}/api/dashboard/recent-interviews`)
      .then(r => r.json())
      .then(data => {
        // Filter interviews for current user if possible
        setInterviews(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user]);

  if (authLoading || !user) return null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Interviews</h1>
        <p className="text-muted-foreground">View your interview history and results</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : interviews.length === 0 ? (
        <div className="text-center py-20 border rounded-2xl bg-card">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-lg font-medium mb-2">No interviews yet</p>
          <p className="text-muted-foreground mb-6">
            Your recruiter will schedule an interview for you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview: any, i: number) => (
            <div key={i} className="border rounded-xl p-6 bg-card hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold capitalize">{interview.interview_type} Interview</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      interview.status === "completed" ? "bg-green-100 text-green-700" :
                      interview.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {interview.status === "in_progress" ? "In Progress" : interview.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {interview.created_at ? new Date(interview.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric"
                    }) : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {interview.overall_score && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{interview.overall_score.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Overall Score</p>
                    </div>
                  )}
                  {interview.status === "in_progress" ? (
                    <Link
                      href={`/interview/${interview.interview_id || interview._id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      Continue →
                    </Link>
                  ) : (
                    <Link
                      href={`/interview/${interview.interview_id || interview._id}`}
                      className="px-4 py-2 border rounded-lg text-sm hover:bg-muted transition"
                    >
                      View Report
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
