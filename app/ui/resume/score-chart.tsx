import type { ResumeReport } from '@/app/lib/definitions';

type ScoreDimension = {
  label: string;
  value: number;
  color: string;
};

export default function ScoreChart({ report }: { report: ResumeReport }) {
  const dimensions: ScoreDimension[] = [
    { label: '内容质量', value: report.content_score, color: 'bg-blue-500' },
    { label: '格式规范', value: report.format_score, color: 'bg-purple-500' },
    { label: '关键词', value: report.keyword_score, color: 'bg-teal-500' },
    { label: '工作经历', value: report.experience_score, color: 'bg-orange-500' },
    { label: '教育背景', value: report.education_score, color: 'bg-pink-500' },
  ];

  return (
    <div className="space-y-3">
      {dimensions.map((dim) => (
        <div key={dim.label} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-right text-xs text-gray-600">{dim.label}</span>
          <div className="flex-1 rounded-full bg-gray-100 h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${dim.color}`}
              style={{ width: `${Math.min(100, Math.max(0, dim.value))}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-xs font-medium text-gray-700">{dim.value}</span>
        </div>
      ))}
    </div>
  );
}
