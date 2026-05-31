"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/utils";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/resume/upload`,
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">InterviewOS</h1>
        <p className="text-muted-foreground text-lg">
          AI-Powered Interview Platform with Adaptive Questioning
        </p>
      </div>

      {/* Upload Section */}
      <div className="border rounded-lg p-8 bg-card space-y-4">
        <h2 className="text-xl font-semibold">Upload Resume</h2>
        <p className="text-sm text-muted-foreground">
          Upload a PDF resume to build a knowledge graph and start an AI interview.
        </p>

        <div className="flex items-center gap-4">
          <label className="flex-1">
            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click to select a PDF resume
                </p>
              )}
            </div>
          </label>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "Processing..." : "Upload & Parse"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Profile Summary */}
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold mb-4">
              {result.profile.name || "Candidate"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {result.profile.summary}
            </p>

            {/* Skills */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {result.profile.skills?.map((skill: any, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            {result.profile.projects?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Projects</h4>
                <div className="space-y-2">
                  {result.profile.projects.map((project: any, i: number) => (
                    <div key={i} className="p-3 bg-muted rounded-md">
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.technologies?.map((tech: any, j: number) => (
                          <span key={j} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                            {tech.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <a
                href={`/interview/${result.candidate_id}`}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition"
              >
                Start Interview
              </a>
              <a
                href={`/candidates/${result.candidate_id}`}
                className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition"
              >
                View Knowledge Graph
              </a>
            </div>
          </div>

          {/* Knowledge Graph Preview */}
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold mb-4">Knowledge Graph</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {result.knowledge_graph?.nodes?.filter((n: any) => n.type === "skill").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Skills</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {result.knowledge_graph?.nodes?.filter((n: any) => n.type === "project").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {result.knowledge_graph?.nodes?.filter((n: any) => n.type === "experience").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Experience</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {result.knowledge_graph?.edges?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Connections</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
