"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          InterviewGPT
        </Link>

        {!loading && (
          <div className="flex items-center gap-6">
            {user ? (
              <>
                {user.role === "recruiter" && (
                  <>
                    <Link href="/recruiter/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition">
                      Dashboard
                    </Link>
                    <Link href="/recruiter/candidates" className="text-sm text-muted-foreground hover:text-foreground transition">
                      Candidates
                    </Link>
                    <Link href="/recruiter/upload" className="text-sm text-muted-foreground hover:text-foreground transition">
                      Upload Resume
                    </Link>
                  </>
                )}
                {user.role === "candidate" && (
                  <>
                    <Link href="/candidate/interviews" className="text-sm text-muted-foreground hover:text-foreground transition">
                      My Interviews
                    </Link>
                    <Link href="/candidate/profile" className="text-sm text-muted-foreground hover:text-foreground transition">
                      Profile
                    </Link>
                  </>
                )}
                <div className="flex items-center gap-3 ml-4 pl-4 border-l">
                  <span className="text-sm text-muted-foreground">
                    {user.name}
                    <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {user.role}
                    </span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-500 hover:text-red-600 transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition">
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
