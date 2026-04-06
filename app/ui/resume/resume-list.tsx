import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import type { Resume } from '@/app/lib/definitions';
import ResumeCard from './resume-card';

export default function ResumeList({ resumes }: { resumes: Resume[] }) {
  if (resumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center">
        <p className="mb-2 text-lg font-medium text-gray-500">还没有简历</p>
        <p className="mb-6 text-sm text-gray-400">上传您的简历，让AI帮助您优化</p>
        <Link
          href="/dashboard/resume/upload"
          className="flex items-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          上传新简历
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resumes.map((resume) => (
        <ResumeCard key={resume.id} resume={resume} />
      ))}
    </div>
  );
}
