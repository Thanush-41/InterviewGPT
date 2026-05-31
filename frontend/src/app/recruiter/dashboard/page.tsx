"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RecruiterDashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentInterviews, setRecentInterviews] = useState<any[]>([]);
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "recruiter")) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [statsRes, recentRes, liveRes] = await Promise.all([
          fetch(`${API_URL}/api/dashboard/stats`),
          fetch(`${API_URL}/api/dashboard/recent-interviews`),
          fetch(`${API_URL}/api/dashboard/live`),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (recentRes.ok) setRecentInterviews(await recentRes.json());
        if (liveRes.ok) setLiveData(await liveRes.json());
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  if (authLoading || !user) return null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}</p>
        </div>
        <Link
          href="/recruiter/upload"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          + Upload Resume
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Candidates" value={stats.total_candidates} color="blue" />
          <StatCard label="Total Interviews" value={stats.total_interviews} color="purple" />
          <StatCard label="Active Now" value={liveData?.live_interviews?.length || 0} color="green" />
          <StatCard label="Avg Score" value={stats.avg_score ? `${stats.avg_score.toFixed(0)}%` : "—"} color="orange" />
        </div>
      )}

      {/* Live Interviews */}
      {liveData?.live_interviews?.length > 0 && (
        <div className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live Interviews
          </h2>
          <div className="space-y-3">
            {liveData.live_interviews.map((interview: any) => (
              <div key={interview.interview_id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{interview.candidate_name || "Candidate"}</p>
                  <p className="text-sm text-muted-foreground">
                    Question {interview.current_question || 0}/10 • {interview.interview_type}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {interview.suspicion_score > 0 && (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                      Suspicion: {interview.suspicion_score}
                    </span>
                  )}
                  <Link
                    href={`/recruiter/candidates/${interview.candidate_id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Interviews */}
      <div className="border rounded-xl p-6 bg-card">
        <h2 className="text-xl font-semibold mb-4">Recent Interviews</h2>
        {recentInterviews.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">Candidate</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInterviews.map((interview: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3">{interview.candidate_name || "Unknown"}</td>
                    <td className="py-3 capitalize">{interview.interview_type}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        interview.status === "completed" ? "bg-green-100 text-green-700" :
                        interview.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {interview.status}
                      </span>
                    </td>
                    <td className="py-3">{interview.overall_score ? `${interview.overall_score.toFixed(0)}%` : "—"}</td>
                    <td className="py-3 text-muted-foreground">
                      {interview.created_at ? new Date(interview.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No interviews yet. Upload a resume to get started.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
  };
  return (
    <div className="border rounded-xl p-6 bg-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold mt-1 bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>
        {value}
      </p>
    </div>
  );
}
