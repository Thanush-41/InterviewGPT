"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CandidateDetailPage() {
  const params = useParams();
  const candidateId = params.id as string;
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/resume/candidates/${candidateId}`)
      .then((res) => res.json())
      .then((data) => {
        setCandidate(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [candidateId]);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!candidate) return <div className="text-center py-12">Candidate not found</div>;

  const kg = candidate.knowledge_graph || { nodes: [], edges: [] };
  const profile = candidate.profile || {};

  const skills = kg.nodes?.filter((n: any) => n.type === "skill") || [];
  const projects = kg.nodes?.filter((n: any) => n.type === "project") || [];
  const experiences = kg.nodes?.filter((n: any) => n.type === "experience") || [];
  const technologies = kg.nodes?.filter((n: any) => n.type === "technology") || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{candidate.name || "Candidate"}</h1>
          <p className="text-muted-foreground">{candidate.email}</p>
        </div>
        <a
          href={`/interview/${candidateId}`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          Start Interview
        </a>
      </div>

      {/* Knowledge Graph Visualization */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-xl font-semibold mb-4">Knowledge Graph</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard count={skills.length} label="Skills" color="blue" />
          <StatCard count={projects.length} label="Projects" color="green" />
          <StatCard count={experiences.length} label="Experience" color="purple" />
          <StatCard count={technologies.length} label="Technologies" color="orange" />
        </div>

        {/* Graph as interactive tree */}
        <div className="space-y-4">
          {/* Skills cluster */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2 text-blue-600">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((node: any) => (
                <span
                  key={node.id}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  title={`Category: ${node.properties?.category || "N/A"} | Level: ${node.properties?.level || "N/A"}`}
                >
                  {node.label}
                </span>
              ))}
            </div>
          </div>

          {/* Projects cluster */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-3 text-green-600">Projects</h3>
            <div className="space-y-3">
              {projects.map((node: any) => {
                // Find connected technologies
                const connectedEdges = kg.edges?.filter(
                  (e: any) => e.source === node.id && e.relationship === "used_tech"
                ) || [];
                const connectedTechs = connectedEdges
                  .map((e: any) => kg.nodes?.find((n: any) => n.id === e.target))
                  .filter(Boolean);

                return (
                  <div key={node.id} className="p-3 bg-green-50 rounded-md">
                    <p className="font-medium text-green-700">{node.label}</p>
                    {node.properties?.description && (
                      <p className="text-xs text-muted-foreground mt-1">{node.properties.description}</p>
                    )}
                    {connectedTechs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {connectedTechs.map((tech: any) => (
                          <span key={tech.id} className="text-xs bg-white border px-2 py-0.5 rounded">
                            {tech.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Experience cluster */}
          {experiences.length > 0 && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-3 text-purple-600">Experience</h3>
              <div className="space-y-2">
                {experiences.map((node: any) => (
                  <div key={node.id} className="p-3 bg-purple-50 rounded-md">
                    <p className="font-medium text-purple-700">{node.label}</p>
                    {node.properties?.duration && (
                      <p className="text-xs text-muted-foreground">{node.properties.duration}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raw Profile Data */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-xl font-semibold mb-4">Full Profile</h2>
        <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
          {JSON.stringify(profile, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function StatCard({ count, label, color }: { count: number; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className={`text-center p-3 rounded-lg ${colorMap[color]}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}
