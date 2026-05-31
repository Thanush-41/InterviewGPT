"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/resume/candidates`)
      .then((res) => res.json())
      .then((data) => {
        setCandidates(data.candidates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading candidates...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Candidates</h1>

      {candidates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No candidates yet. Upload a resume to get started.</p>
          <a href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
            ← Upload Resume
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="border rounded-lg p-4 bg-card flex items-center justify-between">
              <div>
                <p className="font-medium">{candidate.name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{candidate.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {candidate.profile?.summary?.slice(0, 100)}...
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/candidates/${candidate.id}`}
                  className="px-3 py-1.5 border rounded-md text-xs font-medium hover:bg-muted transition"
                >
                  View
                </a>
                <a
                  href={`/interview/${candidate.id}`}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition"
                >
                  Interview
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
