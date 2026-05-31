import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InterviewOS - AI Interview Platform",
  description: "Production-grade AI-powered interview platform with adaptive questioning, voice interviews, and real-time evaluation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <nav className="border-b bg-card">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-primary">
                InterviewOS
              </a>
              <div className="flex gap-6">
                <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
                  Upload Resume
                </a>
                <a href="/candidates" className="text-sm text-muted-foreground hover:text-foreground transition">
                  Candidates
                </a>
                <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition">
                  Dashboard
                </a>
              </div>
            </div>
          </nav>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
