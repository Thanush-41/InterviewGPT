"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentInterviews, setRecentInterviews] = useState<any[]>([]);
  const [liveInterviews, setLiveInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/dashboard/stats`).then((r) => r.json()),
      fetch(`${API_URL}/api/dashboard/recent-interviews`).then((r) => r.json()),
      fetch(`${API_URL}/api/dashboard/live`).then((r) => r.json()),
    ])
      .then(([statsData, recentData, liveData]) => {
        setStats(statsData);
        setRecentInterviews(recentData.interviews || []);
        setLiveInterviews(liveData.live_interviews || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Candidates" value={stats?.total_candidates || 0} />
        <StatCard label="Total Interviews" value={stats?.total_interviews || 0} />
        <StatCard label="Completed" value={stats?.completed_interviews || 0} />
        <StatCard label="In Progress" value={stats?.in_progress_interviews || 0} />
        <StatCard label="Pass Rate" value={`${stats?.pass_rate || 0}%`} />
      </div>

      {/* Average Scores */}
      {stats?.average_scores && (
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-semibold mb-4">Average Scores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreBar label="Technical" score={stats.average_scores.technical} />
            <ScoreBar label="Communication" score={stats.average_scores.communication} />
            <ScoreBar label="Authenticity" score={stats.average_scores.authenticity} />
            <ScoreBar label="Overall" score={stats.average_scores.overall} />
          </div>
        </div>
      )}

      {/* Live Interviews */}
      {liveInterviews.length > 0 && (
        <div className="border border-green-200 rounded-lg p-6 bg-green-50/50">
          <h2 className="text-lg font-semibold mb-4 text-green-700">
            🟢 Live Interviews ({liveInterviews.length})
          </h2>
          <div className="space-y-3">
            {liveInterviews.map((interview) => (
              <div key={interview.id} className="bg-white p-4 rounded-lg border flex items-center justify-between">
                <div>
                  <p className="font-medium">{interview.candidate_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {interview.interview_type} • Q{interview.questions_answered + 1}/10
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md truncate">
                    Current: {interview.current_question}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    interview.suspicion_score > 30 ? "text-red-600" : "text-green-600"
                  }`}>
                    Suspicion: {interview.suspicion_score}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Interviews */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">Recent Interviews</h2>
        {recentInterviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interviews yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Candidate</th>
                  <th className="text-left py-2 font-medium">Type</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Score</th>
                  <th className="text-left py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInterviews.map((interview) => (
                  <tr key={interview.id} className="border-b last:border-0">
                    <td className="py-2">{interview.candidate_name}</td>
                    <td className="py-2 capitalize">{interview.interview_type}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        interview.status === "completed" ? "bg-green-100 text-green-700" :
                        interview.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {interview.status}
                      </span>
                    </td>
                    <td className="py-2 font-medium">
                      {interview.scores?.overall ? `${Math.round(interview.scores.overall)}/100` : "—"}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {interview.created_at ? new Date(interview.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-4 bg-card text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const rounded = Math.round(score || 0);
  const color = rounded >= 80 ? "bg-green-500" : rounded >= 60 ? "bg-blue-500" : rounded >= 40 ? "bg-orange-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-medium">{rounded}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${rounded}%` }} />
      </div>
    </div>
  );
}
