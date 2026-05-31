"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CandidateProfile() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "candidate")) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token || !user) return;
    // Try to find candidate profile by email
    fetch(`${API_URL}/api/resume/candidates`)
      .then(r => r.json())
      .then(data => {
        const match = data.find((c: any) => c.email?.toLowerCase() === user.email.toLowerCase());
        if (match) setProfile(match);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user]);

  if (authLoading || !user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <div className="border rounded-xl p-6 bg-card space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
              Candidate
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading profile...</div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Skills */}
          {profile.profile?.skills?.length > 0 && (
            <div className="border rounded-xl p-6 bg-card">
              <h3 className="font-semibold mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.profile.skills.map((s: any, i: number) => (
                  <span key={i} className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {s.name}
                    {s.level && <span className="ml-1 opacity-60">• {s.level}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {profile.profile?.experience?.length > 0 && (
            <div className="border rounded-xl p-6 bg-card">
              <h3 className="font-semibold mb-3">Experience</h3>
              <div className="space-y-3">
                {profile.profile.experience.map((exp: any, i: number) => (
                  <div key={i} className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">{exp.role}</p>
                    <p className="text-sm text-muted-foreground">{exp.company} • {exp.duration}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {profile.profile?.projects?.length > 0 && (
            <div className="border rounded-xl p-6 bg-card">
              <h3 className="font-semibold mb-3">Projects</h3>
              <div className="space-y-3">
                {profile.profile.projects.map((p: any, i: number) => (
                  <div key={i} className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.technologies?.map((t: any, j: number) => (
                        <span key={j} className="text-xs px-2 py-0.5 bg-background border rounded">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Graph */}
          {profile.knowledge_graph && (
            <div className="border rounded-xl p-6 bg-card">
              <h3 className="font-semibold mb-3">Knowledge Graph</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{profile.knowledge_graph.nodes?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Nodes</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{profile.knowledge_graph.edges?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Connections</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 border rounded-xl bg-card">
          <p className="text-muted-foreground">
            No resume profile found. Ask your recruiter to upload your resume.
          </p>
        </div>
      )}
    </div>
  );
}
