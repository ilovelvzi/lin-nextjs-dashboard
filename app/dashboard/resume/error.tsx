'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ResumeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mb-4" />
      <h2 className="text-lg font-semibold text-gray-800 mb-2">出现了一些问题</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        {error.message || '加载简历列表时发生错误，请稍后重试。'}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors"
      >
        重试
      </button>
    </div>
  );
}
