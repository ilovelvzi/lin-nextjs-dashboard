import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import { getResumeById } from '@/app/lib/resume-actions';
import { fetchResumeReport, fetchResumeSuggestions } from '@/app/lib/resume-data';
import ReportPanel from '@/app/ui/resume/report-panel';
import ResumeStatusBadge from '@/app/ui/resume/resume-status-badge';
import SuggestionCard from '@/app/ui/resume/suggestion-card';

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [resume, report, suggestions] = await Promise.all([
    getResumeById(id),
    fetchResumeReport(id),
    fetchResumeSuggestions(id),
  ]);

  if (!resume) notFound();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/resume"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            返回
          </Link>
          <div>
            <h1 className={`${lusitana.className} text-2xl leading-tight`}>{resume.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <ResumeStatusBadge status={resume.status} />
              {resume.status === 'completed' && (
                <span className="text-sm text-gray-500">评分：{resume.score} / 100</span>
              )}
            </div>
          </div>
        </div>
        {resume.optimized_content && (
          <Link
            href={`/dashboard/resume/${resume.id}/optimized`}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors"
          >
            <SparklesIcon className="h-4 w-4" />
            查看优化版本
          </Link>
        )}
      </div>

      {/* Status messages */}
      {resume.status === 'analyzing' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          AI正在分析您的简历，请稍候，完成后请刷新页面查看结果...
        </div>
      )}

      {resume.status === 'pending' && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          简历已上传，等待分析中...
        </div>
      )}

      {resume.status === 'failed' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          分析失败，请返回列表删除并重新上传。
        </div>
      )}

      {/* Report */}
      {report && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">分析报告</h2>
          <ReportPanel report={report} />
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            优化建议
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({suggestions.length} 条)
            </span>
          </h2>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} resumeId={resume.id} />
            ))}
          </div>
        </div>
      )}

      {/* Original content */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">原始简历</h2>
        <pre className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed overflow-auto">
          {resume.original_content}
        </pre>
      </div>
    </div>
  );
}
