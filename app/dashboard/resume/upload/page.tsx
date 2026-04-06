import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import UploadForm from '@/app/ui/resume/upload-form';

export default function UploadPage() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/resume"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          返回
        </Link>
        <h1 className={`${lusitana.className} text-2xl`}>上传新简历</h1>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <UploadForm />
      </div>
    </div>
  );
}
