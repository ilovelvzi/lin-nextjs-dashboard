import type { ResumeReport } from "@/app/lib/definitions";
import ScoreChart from "./score-chart";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const colorClass =
    score >= 80
      ? "text-green-500"
      : score >= 60
        ? "text-yellow-500"
        : "text-red-500";
  const strokeColor =
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width="140" height="140" className="-rotate-90">
          {/* Background track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          {/* Progress arc */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={clsx("text-4xl font-bold leading-none", colorClass)}>
            {score}
          </span>
          <span className="text-xs text-gray-400 mt-1">/ 100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-500">综合评分</span>
    </div>
  );
}

export default function ReportPanel({ report }: { report: ResumeReport }) {
  return (
    <div className="space-y-6">
      {/* Overall score */}
      <div className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border border-blue-100">
        <ScoreRing score={report.overall_score} />
        {report.summary && (
          <p className="mt-2 text-center text-sm text-gray-600 max-w-lg">
            {report.summary}
          </p>
        )}
      </div>

      {/* Score dimensions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">各维度评分</h3>
        <ScoreChart report={report} />
      </div>

      {/* Strengths */}
      {report.strengths && report.strengths.length > 0 && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircleIcon className="h-5 w-5" />
            优势
          </h3>
          <ul className="space-y-2">
            {report.strengths.map((item, i) => (
              <li
                key={`strength-${i}-${item.slice(0, 12)}`}
                className="flex items-start gap-2 text-sm text-green-800"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {report.weaknesses && report.weaknesses.length > 0 && (
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-700">
            <ExclamationCircleIcon className="h-5 w-5" />
            待提升
          </h3>
          <ul className="space-y-2">
            {report.weaknesses.map((item, i) => (
              <li
                key={`weakness-${i}-${item.slice(0, 12)}`}
                className="flex items-start gap-2 text-sm text-orange-800"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
