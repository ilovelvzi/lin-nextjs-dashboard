import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import { getResumeById } from '@/app/lib/resume-actions';
import CompareView from '@/app/ui/resume/compare-view';

export default async function OptimizedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const resume = await getResumeById(id);
  if (!resume || !resume.optimized_content) notFound();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/resume/${resume.id}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            返回分析报告
          </Link>
          <h1 className={`${lusitana.className} text-2xl`}>
            <SparklesIcon className="inline h-6 w-6 text-blue-500 mr-2" />
            优化版本对比
          </h1>
        </div>
        <span className="text-sm text-gray-500">{resume.title}</span>
      </div>

      <CompareView
        originalContent={resume.original_content}
        optimizedContent={resume.optimized_content}
      />
    </div>
  );
}
