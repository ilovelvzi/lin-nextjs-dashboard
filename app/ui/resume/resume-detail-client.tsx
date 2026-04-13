"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  Resume,
  ResumeReport,
  ResumeSuggestion,
} from "@/app/lib/definitions";
import ReportPanel from "./report-panel";
import SuggestionCard from "./suggestion-card";
import OriginalFileViewer from "./original-file-viewer";
import MarkdownContent from "./markdown-content";
import { SparklesIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { batchApplyOptimizations } from "@/app/lib/resume-actions";
import clsx from "clsx";

type AnalysisPhase =
  | "idle"
  | "connecting"
  | "analyzing"
  | "report_received"
  | "receiving_suggestions"
  | "completed"
  | "failed";

type TabId = "report" | "suggestions" | "original";

/** Parse SSE stream, call onEvent for each completed event/data pair. */
async function consumeSSEStream(
  response: Response,
  onEvent: (event: string, data: Record<string, unknown>) => boolean | void,
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("无法建立流连接");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let eventType = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ") && eventType) {
        try {
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          const stop = onEvent(eventType, data);
          if (stop) return;
        } catch {
          // ignore unparseable lines
        }
        eventType = "";
      }
    }
  }
}

/** Returns a 0-100 progress value based on current phase. */
function phaseToProgress(
  phase: AnalysisPhase,
  idx: number,
  total: number,
): number {
  switch (phase) {
    case "connecting":
      return 8;
    case "analyzing":
      return 30;
    case "report_received":
      return 60;
    case "receiving_suggestions":
      return total > 0 ? Math.round(60 + (idx / total) * 30) : 70;
    case "completed":
      return 100;
    default:
      return 0;
  }
}

export default function ResumeDetailClient({
  resume,
  initialReport,
  initialSuggestions,
}: {
  resume: Resume;
  initialReport: ResumeReport | null;
  initialSuggestions: ResumeSuggestion[];
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<AnalysisPhase>(() => {
    if (resume.status === "completed") return "completed";
    if (resume.status === "failed") return "failed";
    return "idle";
  });
  const [report, setReport] = useState<ResumeReport | null>(initialReport);
  const [suggestions, setSuggestions] =
    useState<ResumeSuggestion[]>(initialSuggestions);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [suggestionProgress, setSuggestionProgress] = useState({
    index: 0,
    total: 0,
  });

  // Determine initial active tab
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (initialReport) return "report";
    if (initialSuggestions.length > 0) return "suggestions";
    return "original";
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState("");
  const [optimizePreview, setOptimizePreview] = useState("");
  const [isBatchApplying, setIsBatchApplying] = useState(false);

  const streamStartedRef = useRef(false);

  const startAnalysis = useCallback(
    (force = false) => {
      if (streamStartedRef.current && !force) return;
      streamStartedRef.current = true;

      setPhase("connecting");
      setStatusMessage("正在连接AI分析服务...");
      setErrorMessage("");

      fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent: resume.original_content,
          jobDescription: resume.job_description ?? undefined,
          resumeId: resume.id,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(
              (errData as { error?: string }).error ?? "分析请求失败",
            );
          }

          await consumeSSEStream(response, (event, data) => {
            switch (event) {
              case "status":
                setPhase("analyzing");
                setStatusMessage((data.message as string) ?? "AI正在分析...");
                break;
              case "report":
                setPhase("report_received");
                setStatusMessage("分析报告已生成，正在加载优化建议...");
                setReport({
                  id: "",
                  resume_id: "",
                  overall_score: (data.overall_score as number) ?? 0,
                  content_score: (data.content_score as number) ?? 0,
                  format_score: (data.format_score as number) ?? 0,
                  keyword_score: (data.keyword_score as number) ?? 0,
                  experience_score: (data.experience_score as number) ?? 0,
                  education_score: (data.education_score as number) ?? 0,
                  summary: (data.summary as string) ?? null,
                  strengths: (data.strengths as string[]) ?? [],
                  weaknesses: (data.weaknesses as string[]) ?? [],
                  created_at: "",
                });
                setActiveTab("report");
                break;
              case "suggestion": {
                const idx = (data.index as number) ?? 0;
                const total = (data.total as number) ?? 0;
                setPhase("receiving_suggestions");
                setStatusMessage(`正在加载优化建议 (${idx + 1}/${total})...`);
                setSuggestionProgress({ index: idx + 1, total });
                setSuggestions((prev) => [
                  ...prev,
                  {
                    id: data.id as string,
                    resume_id: data.resume_id as string,
                    category: data.category as string,
                    original_text: data.original_text as string | null,
                    suggested_text: data.suggested_text as string | null,
                    reason: data.reason as string | null,
                    priority: data.priority as "high" | "medium" | "low",
                    is_applied: false,
                    created_at: "",
                  },
                ]);
                if (idx === 0) setActiveTab("suggestions");
                break;
              }
              case "done":
                setPhase("completed");
                setStatusMessage("");
                router.refresh();
                break;
              case "error":
                setPhase("failed");
                setErrorMessage(
                  (data.message as string) ?? "AI分析失败，请稍后重试",
                );
                break;
            }
          });
        })
        .catch((err) => {
          setPhase("failed");
          setErrorMessage(
            err instanceof Error ? err.message : "AI分析失败，请稍后重试",
          );
        });
    },
    [resume.id, resume.original_content, resume.job_description, router],
  );

  const handleRetry = () => {
    streamStartedRef.current = false;
    setSuggestions([]);
    setReport(null);
    setSuggestionProgress({ index: 0, total: 0 });
    startAnalysis(true);
  };

  // Auto-start for pending or stuck-in-analyzing resumes
  useEffect(() => {
    if (
      (resume.status === "pending" || resume.status === "analyzing") &&
      !streamStartedRef.current
    ) {
      startAnalysis();
    }
  }, [resume.status, startAnalysis]);

  const handleGenerateOptimized = async () => {
    const appliedSuggestions = suggestions.filter((s) => s.is_applied);
    if (appliedSuggestions.length === 0) {
      setErrorMessage("请先采纳至少一条建议后再生成优化简历");
      return;
    }

    setIsOptimizing(true);
    setOptimizeProgress("正在连接AI优化服务...");
    setOptimizePreview("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent: resume.original_content,
          jobDescription: resume.job_description ?? undefined,
          resumeId: resume.id,
          appliedSuggestions: appliedSuggestions.map((s) => ({
            category: s.category,
            original_text: s.original_text,
            suggested_text: s.suggested_text,
            reason: s.reason,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: string }).error ?? "优化请求失败",
        );
      }

      await consumeSSEStream(response, (event, data) => {
        if (event === "status") {
          setOptimizeProgress(
            (data.message as string) ?? "正在生成优化简历...",
          );
        } else if (event === "chunk") {
          setOptimizeProgress("AI正在生成优化简历...");
          setOptimizePreview((prev) => prev + ((data.text as string) ?? ""));
        } else if (event === "done") {
          setIsOptimizing(false);
          setOptimizeProgress("");
          router.push(`/dashboard/resume/${resume.id}/optimized`);
          return true;
        } else if (event === "error") {
          throw new Error((data.message as string) ?? "AI优化失败");
        }
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "AI优化失败，请稍后重试",
      );
      setIsOptimizing(false);
      setOptimizeProgress("");
    }
  };

  const handleSuggestionToggle = (suggestionId: string, applied: boolean) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId ? { ...s, is_applied: applied } : s,
      ),
    );
  };

  const handleBatchApply = async () => {
    const unapplied = suggestions.filter((s) => !s.is_applied);
    if (unapplied.length === 0) return;
    setIsBatchApplying(true);
    try {
      await batchApplyOptimizations(
        unapplied.map((s) => s.id),
        resume.id,
      );
      setSuggestions((prev) => prev.map((s) => ({ ...s, is_applied: true })));
    } catch {
      setErrorMessage("批量采纳失败，请逐条操作");
    } finally {
      setIsBatchApplying(false);
    }
  };

  const appliedCount = suggestions.filter((s) => s.is_applied).length;
  const unappliedCount = suggestions.length - appliedCount;
  const isAnalysisInProgress =
    phase === "connecting" ||
    phase === "analyzing" ||
    phase === "report_received" ||
    phase === "receiving_suggestions";

  const progressPercent = phaseToProgress(
    phase,
    suggestionProgress.index,
    suggestionProgress.total,
  );

  // Build tab list dynamically
  const tabs: { id: TabId; label: string; badge?: string | number }[] = [
    ...(report ? [{ id: "report" as TabId, label: "分析报告" }] : []),
    ...(suggestions.length > 0
      ? [
          {
            id: "suggestions" as TabId,
            label: "优化建议",
            badge: suggestions.length,
          },
        ]
      : []),
    { id: "original" as TabId, label: "原始简历" },
  ];

  // If active tab is no longer available, fall back
  const resolvedTab: TabId = tabs.find((t) => t.id === activeTab)
    ? activeTab
    : (tabs[0]?.id ?? "original");

  return (
    <div className="space-y-4">
      {/* Analysis progress banner */}
      {isAnalysisInProgress && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-sm font-medium text-blue-700">{statusMessage}</p>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-blue-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-blue-500 text-right">
            {progressPercent}%
          </p>
        </div>
      )}

      {/* Error banner */}
      {(phase === "failed" || (errorMessage && !isAnalysisInProgress)) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {errorMessage || "分析失败，请重试。"}
          </p>
          {phase === "failed" && (
            <button
              onClick={handleRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              重新分析
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="border-b border-gray-200">
          <nav className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  resolvedTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                )}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={clsx(
                      "rounded-full px-1.5 py-0.5 text-xs font-medium",
                      resolvedTab === tab.id
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Tab content */}
      {resolvedTab === "report" && report && <ReportPanel report={report} />}

      {resolvedTab === "suggestions" && suggestions.length > 0 && (
        <div className="space-y-4">
          {/* Suggestion header with batch actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">
              共 {suggestions.length} 条建议
              {appliedCount > 0 && `，已采纳 ${appliedCount} 条`}
            </p>
            {unappliedCount > 0 && phase === "completed" && (
              <button
                onClick={handleBatchApply}
                disabled={isBatchApplying}
                className="text-xs font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50 transition-colors"
              >
                {isBatchApplying
                  ? "处理中..."
                  : `全部采纳 (${unappliedCount} 条)`}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                resumeId={resume.id}
                onToggle={handleSuggestionToggle}
              />
            ))}
          </div>

          {/* Generate optimized resume */}
          {phase === "completed" && (
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
              <div className="flex items-start gap-3">
                <SparklesIcon className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800">
                    生成优化简历
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    根据您已采纳的建议，AI 将自动生成一份优化后的完整简历。
                  </p>

                  {/* Streaming preview */}
                  {optimizePreview && (
                    <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-blue-200 bg-white p-4">
                      <MarkdownContent content={optimizePreview} />
                      {isOptimizing && (
                        <span className="inline-block w-1.5 h-3.5 bg-blue-400 ml-0.5 animate-pulse align-bottom" />
                      )}
                    </div>
                  )}

                  {isOptimizing && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      <span className="text-sm text-blue-600">
                        {optimizeProgress}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateOptimized}
                    disabled={isOptimizing || appliedCount === 0}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    {isOptimizing
                      ? "生成中..."
                      : appliedCount > 0
                        ? `根据 ${appliedCount} 条建议生成优化简历`
                        : "请先采纳至少一条建议"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {resolvedTab === "original" && (
        <div className={resume.original_file_type ? "h-[calc(100vh-18rem)] rounded-xl border border-gray-200 overflow-hidden" : undefined}>
          <OriginalFileViewer
            resumeId={resume.id}
            fileType={resume.original_file_type}
            originalHtml={resume.original_html}
            fallbackContent={resume.original_content}
          />
        </div>
      )}
    </div>
  );
}
