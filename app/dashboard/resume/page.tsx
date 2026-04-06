import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import { getUserResumes } from '@/app/lib/resume-actions';
import ResumeList from '@/app/ui/resume/resume-list';

export default async function ResumePage() {
  const resumes = await getUserResumes();

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between mb-6">
        <h1 className={`${lusitana.className} text-2xl`}>简历优化</h1>
        <Link
          href="/dashboard/resume/upload"
          className="flex items-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          上传新简历
        </Link>
      </div>
      <ResumeList resumes={resumes} />
    </div>
  );
}
