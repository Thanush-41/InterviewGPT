"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RecruiterCandidates() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "recruiter")) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/resume/candidates`)
      .then(r => r.json())
      .then(setCandidates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (authLoading || !user) return null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Candidates</h1>
        <Link
          href="/recruiter/upload"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          + Upload Resume
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading candidates...</div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">No candidates yet</p>
          <Link href="/recruiter/upload" className="text-blue-600 hover:underline">
            Upload a resume to get started →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {candidates.map((c: any) => (
            <div key={c._id || c.id} className="border rounded-xl p-6 bg-card hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.email}</p>
                  {c.profile?.skills && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.profile.skills.slice(0, 8).map((s: any, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {s.name}
                        </span>
                      ))}
                      {c.profile.skills.length > 8 && (
                        <span className="text-xs text-muted-foreground">+{c.profile.skills.length - 8} more</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/recruiter/candidates/${c._id || c.id}`}
                    className="px-4 py-2 border rounded-lg text-sm hover:bg-muted transition"
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={async () => {
                      const res = await fetch(`${API_URL}/api/interview/start`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ candidate_id: c._id || c.id, interview_type: "technical" }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        router.push(`/interview/${data.interview_id}`);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition"
                  >
                    Start Interview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
