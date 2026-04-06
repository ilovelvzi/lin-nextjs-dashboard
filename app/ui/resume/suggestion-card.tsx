'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { ResumeSuggestion } from '@/app/lib/definitions';
import { applyOptimization } from '@/app/lib/resume-actions';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

function PriorityBadge({ priority }: { priority: ResumeSuggestion['priority'] }) {
  return (
    <span
      className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', {
        'bg-red-100 text-red-700': priority === 'high',
        'bg-yellow-100 text-yellow-700': priority === 'medium',
        'bg-gray-100 text-gray-600': priority === 'low',
      })}
    >
      {priority === 'high' ? '高优先级' : priority === 'medium' ? '中优先级' : '低优先级'}
    </span>
  );
}

export default function SuggestionCard({
  suggestion,
  resumeId,
}: {
  suggestion: ResumeSuggestion;
  resumeId: string;
}) {
  const [applied, setApplied] = useState(suggestion.is_applied);
  const [isLoading, setIsLoading] = useState(false);

  const handleApply = async () => {
    if (applied || isLoading) return;
    setIsLoading(true);
    try {
      await applyOptimization(suggestion.id, resumeId);
      setApplied(true);
    } catch {
      // keep original state on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 transition-colors',
        applied ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {suggestion.category}
          </span>
          <PriorityBadge priority={suggestion.priority} />
        </div>
        {applied && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <CheckCircleIcon className="h-4 w-4" />
            已采纳
          </span>
        )}
      </div>

      {suggestion.original_text && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-500 mb-1">原文：</p>
          <p className="text-sm text-gray-700 bg-red-50 rounded-md px-3 py-2 line-through">
            {suggestion.original_text}
          </p>
        </div>
      )}

      {suggestion.suggested_text && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-500 mb-1">建议修改为：</p>
          <p className="text-sm text-gray-800 bg-green-50 rounded-md px-3 py-2">
            {suggestion.suggested_text}
          </p>
        </div>
      )}

      {suggestion.reason && (
        <p className="text-xs text-gray-500 mt-2 italic">{suggestion.reason}</p>
      )}

      {!applied && (
        <button
          onClick={handleApply}
          disabled={isLoading}
          className="mt-3 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-400 disabled:opacity-50 transition-colors"
        >
          {isLoading ? '处理中...' : '采纳建议'}
        </button>
      )}
    </div>
  );
}
