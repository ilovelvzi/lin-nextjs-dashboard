'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Resume,
  ResumeReport,
  ResumeSuggestion,
} from '@/app/lib/definitions';
import ReportPanel from './report-panel';
import SuggestionCard from './suggestion-card';
import ResumeContent from './resume-content';
import { SparklesIcon } from '@heroicons/react/24/outline';

type AnalysisPhase =
  | 'idle'
  | 'connecting'
  | 'analyzing'
  | 'report_received'
  | 'receiving_suggestions'
  | 'completed'
  | 'failed';

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
  const [phase, setPhase] = useState<AnalysisPhase>(
    resume.status === 'completed' ? 'completed' : 'idle',
  );
  const [report, setReport] = useState<ResumeReport | null>(initialReport);
  const [suggestions, setSuggestions] = useState<ResumeSuggestion[]>(
    initialSuggestions,
  );
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState('');
  const streamStartedRef = useRef(false);

  // Start streaming analysis when resume is pending
  const startAnalysis = useCallback(() => {
    if (streamStartedRef.current) return;
    streamStartedRef.current = true;
    setPhase('connecting');
    setStatusMessage('正在连接AI分析服务...');

    fetch('/api/resume/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeContent: resume.original_content,
        jobDescription: resume.job_description || undefined,
        resumeId: resume.id,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: string }).error || '分析请求失败',
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法建立流连接');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let eventType = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ') && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(eventType, data);
              } catch {
                // ignore invalid JSON lines
              }
              eventType = '';
            }
          }
        }
      })
      .catch((err) => {
        setPhase('failed');
        setErrorMessage(
          err instanceof Error ? err.message : 'AI分析失败，请稍后重试',
        );
      });
  }, [resume.id, resume.original_content, resume.job_description]);

  function handleSSEEvent(event: string, data: Record<string, unknown>) {
    switch (event) {
      case 'status':
        setPhase('analyzing');
        setStatusMessage((data.message as string) || 'AI正在分析...');
        break;
      case 'report':
        setPhase('report_received');
        setStatusMessage('分析报告已生成，正在加载优化建议...');
        setReport({
          id: '',
          resume_id: '',
          overall_score: (data.overall_score as number) ?? 0,
          content_score: (data.content_score as number) ?? 0,
          format_score: (data.format_score as number) ?? 0,
          keyword_score: (data.keyword_score as number) ?? 0,
          experience_score: (data.experience_score as number) ?? 0,
          education_score: (data.education_score as number) ?? 0,
          summary: (data.summary as string) ?? null,
          strengths: (data.strengths as string[]) ?? [],
          weaknesses: (data.weaknesses as string[]) ?? [],
          created_at: '',
        });
        break;
      case 'suggestion':
        setPhase('receiving_suggestions');
        setStatusMessage(
          `正在加载优化建议 (${(data.index as number) + 1}/${data.total as number})...`,
        );
        setSuggestions((prev) => [
          ...prev,
          {
            id: data.id as string,
            resume_id: data.resume_id as string,
            category: data.category as string,
            original_text: data.original_text as string | null,
            suggested_text: data.suggested_text as string | null,
            reason: data.reason as string | null,
            priority: data.priority as 'high' | 'medium' | 'low',
            is_applied: false,
            created_at: '',
          },
        ]);
        break;
      case 'done':
        setPhase('completed');
        setStatusMessage('');
        break;
      case 'error':
        setPhase('failed');
        setErrorMessage(
          (data.message as string) || 'AI分析失败，请稍后重试',
        );
        break;
    }
  }

  // Auto-start analysis for pending resumes
  useEffect(() => {
    if (resume.status === 'pending' && !streamStartedRef.current) {
      startAnalysis();
    }
  }, [resume.status, startAnalysis]);

  // Handle generating optimized resume
  const handleGenerateOptimized = async () => {
    const appliedSuggestions = suggestions.filter((s) => s.is_applied);
    if (appliedSuggestions.length === 0) {
      setErrorMessage('请先采纳至少一条建议后再生成优化简历');
      return;
    }

    setIsOptimizing(true);
    setOptimizeProgress('正在连接AI优化服务...');
    setErrorMessage('');

    try {
      const response = await fetch('/api/resume/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeContent: resume.original_content,
          jobDescription: resume.job_description || undefined,
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
          (errData as { error?: string }).error || '优化请求失败',
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法建立流连接');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === 'status') {
                setOptimizeProgress(
                  (data.message as string) || '正在生成优化简历...',
                );
              } else if (eventType === 'chunk') {
                setOptimizeProgress('AI正在生成优化简历...');
              } else if (eventType === 'done') {
                setIsOptimizing(false);
                setOptimizeProgress('');
                router.push(`/dashboard/resume/${resume.id}/optimized`);
              } else if (eventType === 'error') {
                throw new Error(
                  (data.message as string) || 'AI优化失败',
                );
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.message !== 'AI优化失败'
              ) {
                // ignore JSON parse errors for partial lines
              } else {
                throw parseErr;
              }
            }
            eventType = '';
          }
        }
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'AI优化失败，请稍后重试',
      );
      setIsOptimizing(false);
      setOptimizeProgress('');
    }
  };

  // Update suggestion applied state
  const handleSuggestionApplied = (suggestionId: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId ? { ...s, is_applied: true } : s,
      ),
    );
  };

  const appliedCount = suggestions.filter((s) => s.is_applied).length;
  const isAnalysisInProgress =
    phase === 'connecting' ||
    phase === 'analyzing' ||
    phase === 'report_received' ||
    phase === 'receiving_suggestions';

  return (
    <div className="space-y-6">
      {/* Analysis progress */}
      {isAnalysisInProgress && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-sm font-medium text-blue-700">
              {statusMessage}
            </p>
          </div>
          {phase === 'analyzing' && (
            <div className="mt-3 h-1.5 rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 animate-pulse w-2/3" />
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {phase === 'failed' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage || '分析失败，请返回列表删除并重新上传。'}
        </div>
      )}

      {/* Error from optimize action */}
      {errorMessage && phase !== 'failed' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="animate-in fade-in duration-500">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            分析报告
          </h2>
          <ReportPanel report={report} />
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              优化建议
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({suggestions.length} 条
                {appliedCount > 0 && `，已采纳 ${appliedCount} 条`})
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                resumeId={resume.id}
                onApplied={handleSuggestionApplied}
              />
            ))}
          </div>

          {/* Generate optimized resume button */}
          {phase === 'completed' && (
            <div className="mt-6 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
              <div className="flex items-start gap-3">
                <SparklesIcon className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-800">
                    生成优化简历
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    根据您已采纳的建议，AI 将自动生成一份优化后的完整简历。
                    请先采纳您认同的建议，然后点击下方按钮。
                  </p>
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
                      ? '生成中...'
                      : appliedCount > 0
                        ? `根据 ${appliedCount} 条建议生成优化简历`
                        : '请先采纳至少一条建议'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Original content */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">原始简历</h2>
        <ResumeContent content={resume.original_content} />
      </div>
    </div>
  );
}
