"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function InterviewPage() {
  const params = useParams();
  const candidateId = params.id as string;

  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [questionsRemaining, setQuestionsRemaining] = useState(10);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [malpracticeEvents, setMalpracticeEvents] = useState<string[]>([]);

  const questionTimestamp = useRef<number>(Date.now());

  // Malpractice Detection
  useEffect(() => {
    if (!interviewId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportMalpractice("tab_switch");
        setMalpracticeEvents((prev) => [...prev, "Tab switch detected"]);
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      reportMalpractice("paste");
      setMalpracticeEvents((prev) => [...prev, "Paste event detected"]);
    };

    const handleBlur = () => {
      reportMalpractice("window_blur");
      setMalpracticeEvents((prev) => [...prev, "Window blur detected"]);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("paste", handlePaste);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("paste", handlePaste);
      window.removeEventListener("blur", handleBlur);
    };
  }, [interviewId]);

  const reportMalpractice = async (eventType: string) => {
    if (!interviewId) return;
    try {
      await fetch(`${API_URL}/api/interview/${interviewId}/malpractice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      // Non-critical
    }
  };

  const startInterview = async () => {
    setStarting(true);
    try {
      const res = await fetch(`${API_URL}/api/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          interview_type: "technical",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setInterviewId(data.interview_id);
      setCurrentQuestion(data.question);
      setDifficulty(data.difficulty);
      setQuestionNumber(data.question_number);
      questionTimestamp.current = Date.now();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !interviewId) return;
    setLoading(true);

    const responseTime = (Date.now() - questionTimestamp.current) / 1000;

    try {
      const res = await fetch(`${API_URL}/api/interview/${interviewId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: answer,
          response_time_seconds: responseTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setEvaluations((prev) => [...prev, { question: currentQuestion, answer, evaluation: data.evaluation }]);
      setAnswer("");

      if (data.status === "completed") {
        setFinalReport(data);
        setCurrentQuestion("");
      } else {
        setCurrentQuestion(data.next_question);
        setDifficulty(data.difficulty);
        setQuestionNumber(data.question_number);
        setQuestionsRemaining(data.questions_remaining);
        questionTimestamp.current = Date.now();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Web Speech API for voice input
  const toggleVoiceInput = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswer(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Not started state
  if (!interviewId) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
        <h1 className="text-3xl font-bold">Start Interview</h1>
        <p className="text-muted-foreground">
          Begin an AI-powered adaptive interview. Questions will be generated based on the
          candidate&apos;s resume and will adapt based on performance.
        </p>
        <div className="p-4 bg-muted rounded-lg text-sm text-left space-y-2">
          <p><strong>How it works:</strong></p>
          <ul className="list-disc ml-4 space-y-1">
            <li>10 adaptive questions based on your resume</li>
            <li>Difficulty increases with good answers</li>
            <li>AI evaluates technical depth, clarity, and authenticity</li>
            <li>Voice input supported (Chrome/Edge)</li>
          </ul>
        </div>
        <button
          onClick={startInterview}
          disabled={starting}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-lg disabled:opacity-50 hover:opacity-90 transition"
        >
          {starting ? "Generating First Question..." : "Start Interview"}
        </button>
      </div>
    );
  }

  // Completed state
  if (finalReport) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Interview Complete</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ScoreCard label="Overall" score={finalReport.final_scores?.overall} />
          <ScoreCard label="Technical" score={finalReport.final_scores?.technical} />
          <ScoreCard label="Communication" score={finalReport.final_scores?.communication} />
          <ScoreCard label="Authenticity" score={finalReport.final_scores?.authenticity || finalReport.authenticity?.authenticity_score} />
        </div>

        {finalReport.authenticity && (
          <div className="border rounded-lg p-6 bg-card space-y-3">
            <h3 className="font-semibold">Authenticity Assessment</h3>
            <p className="text-sm text-muted-foreground">{finalReport.authenticity.reasoning}</p>
            {finalReport.authenticity.genuine_areas?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-600">Strong Areas:</p>
                <div className="flex flex-wrap gap-1">
                  {finalReport.authenticity.genuine_areas.map((area: string, i: number) => (
                    <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{area}</span>
                  ))}
                </div>
              </div>
            )}
            {finalReport.authenticity.suspicious_areas?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600">Needs Verification:</p>
                <div className="flex flex-wrap gap-1">
                  {finalReport.authenticity.suspicious_areas.map((area: string, i: number) => (
                    <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{area}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {malpracticeEvents.length > 0 && (
          <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
            <h4 className="text-sm font-medium text-orange-700">Malpractice Signals ({malpracticeEvents.length})</h4>
            <ul className="text-xs text-orange-600 mt-1">
              {malpracticeEvents.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-semibold">Question History</h3>
          {evaluations.map((ev, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Q{i + 1}: {ev.question}</p>
              <p className="text-sm text-muted-foreground">A: {ev.answer}</p>
              <div className="flex gap-3 text-xs">
                <span className="text-blue-600">Technical: {ev.evaluation?.technical_score || "—"}</span>
                <span className="text-green-600">Communication: {ev.evaluation?.communication_score || "—"}</span>
                <span className="text-purple-600">Overall: {ev.evaluation?.overall_score || "—"}</span>
              </div>
            </div>
          ))}
        </div>

        <a href="/dashboard" className="block text-center text-primary hover:underline">
          Go to Dashboard →
        </a>
      </div>
    );
  }

  // In-progress state
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Question {questionNumber} of 10</h2>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            difficulty === "resume_based" ? "bg-green-100 text-green-700" :
            difficulty === "deep_dive" ? "bg-blue-100 text-blue-700" :
            difficulty === "cross_question" ? "bg-purple-100 text-purple-700" :
            "bg-red-100 text-red-700"
          }`}>
            {difficulty.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${(questionNumber / 10) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="border rounded-lg p-6 bg-card">
        <p className="text-lg">{currentQuestion}</p>
      </div>

      {/* Answer input */}
      <div className="space-y-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer or use voice input..."
          rows={5}
          className="w-full p-4 border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <div className="flex justify-between items-center">
          <button
            onClick={toggleVoiceInput}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              isListening
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {isListening ? "🔴 Listening..." : "🎤 Voice Input"}
          </button>
          <button
            onClick={submitAnswer}
            disabled={!answer.trim() || loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "Evaluating..." : "Submit Answer"}
          </button>
        </div>
      </div>

      {/* Previous evaluations */}
      {evaluations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Previous Answers</h4>
          {evaluations.slice(-3).map((ev, i) => (
            <div key={i} className="text-xs p-3 bg-muted rounded-md">
              <p className="font-medium">Q: {ev.question}</p>
              <p className="text-muted-foreground mt-1">Score: {ev.evaluation?.overall_score || "—"}/100</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score?: number }) {
  const value = Math.round(score || 0);
  const color = value >= 80 ? "text-green-600" : value >= 60 ? "text-blue-600" : value >= 40 ? "text-orange-600" : "text-red-600";
  return (
    <div className="border rounded-lg p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
