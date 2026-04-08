import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import { getResumeById } from '@/app/lib/resume-actions';
import { fetchResumeReport, fetchResumeSuggestions } from '@/app/lib/resume-data';
import ResumeStatusBadge from '@/app/ui/resume/resume-status-badge';
import ResumeDetailClient from '@/app/ui/resume/resume-detail-client';

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

      {/* Client component handles streaming analysis and display */}
      <ResumeDetailClient
        resume={resume}
        initialReport={report}
        initialSuggestions={suggestions}
      />
    </div>
  );
}
