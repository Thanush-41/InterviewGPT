"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RecruiterUpload() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "recruiter")) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/resume/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold">Upload Resume</h1>
      <p className="text-muted-foreground">
        Upload a candidate&apos;s PDF resume. AI will parse it, build a knowledge graph, and prepare adaptive interview questions.
      </p>

      <div className="border-2 border-dashed rounded-2xl p-12 text-center hover:border-blue-400 transition cursor-pointer bg-card">
        <label className="cursor-pointer block">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="text-4xl">📄</div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl">📤</div>
              <p className="font-medium">Click to select a PDF resume</p>
              <p className="text-sm text-muted-foreground">Max 10MB</p>
            </div>
          )}
        </label>
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? "Processing with AI..." : "Upload & Parse Resume"}
      </button>

      {error && (
        <p className="text-red-500 bg-red-50 dark:bg-red-950/30 p-4 rounded-xl">{error}</p>
      )}

      {result && (
        <div className="border rounded-xl p-6 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{result.name}</h2>
              <p className="text-sm text-muted-foreground">{result.profile?.email}</p>
            </div>
            <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              Parsed Successfully
            </span>
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-sm font-medium mb-2">Skills ({result.profile?.skills?.length || 0})</h3>
            <div className="flex flex-wrap gap-1.5">
              {result.profile?.skills?.map((s: any, i: number) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          {/* Knowledge Graph Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xl font-bold">{result.knowledge_graph?.nodes?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Graph Nodes</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xl font-bold">{result.knowledge_graph?.edges?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Connections</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xl font-bold">{result.embeddings_stored || 0}</p>
              <p className="text-xs text-muted-foreground">Embeddings</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={async () => {
                const res = await fetch(`${API_URL}/api/interview/start`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ candidate_id: result.candidate_id, interview_type: "technical" }),
                });
                if (res.ok) {
                  const data = await res.json();
                  router.push(`/interview/${data.interview_id}`);
                }
              }}
              className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
            >
              Start Interview →
            </button>
            <button
              onClick={() => router.push("/recruiter/candidates")}
              className="flex-1 py-3 border rounded-lg font-medium hover:bg-muted transition"
            >
              View All Candidates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
