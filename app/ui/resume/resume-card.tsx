import Link from 'next/link';
import { TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { Resume } from '@/app/lib/definitions';
import ResumeStatusBadge from './resume-status-badge';
import { deleteResume } from '@/app/lib/resume-actions';

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ResumeCard({ resume }: { resume: Resume }) {
  const deleteResumeWithId = deleteResume.bind(null, resume.id);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/resume/${resume.id}`}
          className="flex items-center gap-2 text-gray-800 hover:text-blue-600"
        >
          <DocumentTextIcon className="h-5 w-5 shrink-0 text-blue-500" />
          <span className="font-medium leading-tight line-clamp-2">{resume.title}</span>
        </Link>
        <ResumeStatusBadge status={resume.status} />
      </div>

      {resume.status === 'completed' && (
        <div className="flex items-center gap-1">
          <span className="text-3xl font-bold text-blue-600">{resume.score}</span>
          <span className="text-sm text-gray-500">/ 100</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatDate(resume.created_at)}</span>
        <form action={deleteResumeWithId}>
          <button
            type="submit"
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            aria-label="删除简历"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            删除
          </button>
        </form>
      </div>
    </div>
  );
}
