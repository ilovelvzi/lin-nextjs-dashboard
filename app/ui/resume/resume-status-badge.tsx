import clsx from 'clsx';
import type { Resume } from '@/app/lib/definitions';

type StatusType = Resume['status'];

export default function ResumeStatusBadge({ status }: { status: StatusType }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        {
          'bg-gray-100 text-gray-600': status === 'pending',
          'bg-blue-100 text-blue-700': status === 'analyzing',
          'bg-green-100 text-green-700': status === 'completed',
          'bg-red-100 text-red-700': status === 'failed',
        }
      )}
    >
      {status === 'analyzing' && (
        <span className="h-2 w-2 animate-spin rounded-full border border-blue-600 border-t-transparent" />
      )}
      {status === 'pending' && '待分析'}
      {status === 'analyzing' && '分析中'}
      {status === 'completed' && '已完成'}
      {status === 'failed' && '分析失败'}
    </span>
  );
}
