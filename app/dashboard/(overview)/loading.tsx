const shimmer =
  "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent";

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={`${shimmer} relative overflow-hidden rounded-md bg-gray-100 ${className}`}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl bg-gray-50 p-2 shadow-sm">
      <div className="flex p-4 gap-2">
        <div className="h-5 w-5 rounded-md bg-gray-200" />
        <div className="h-5 w-20 rounded-md bg-gray-200" />
      </div>
      <div className="flex items-center justify-center rounded-xl bg-white px-4 py-8">
        <div
          className={`${shimmer} relative overflow-hidden h-7 w-12 rounded-md bg-gray-200`}
        />
      </div>
    </div>
  );
}

function FeatureCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2 h-10 w-10" />
        <div className="flex flex-col gap-2">
          <Bar className="h-4 w-24" />
          <Bar className="h-3 w-40" />
        </div>
      </div>
      <div className="h-4 w-4 rounded bg-gray-100" />
    </div>
  );
}

export default function Loading() {
  return (
    <main>
      {/* 标题与问候 */}
      <Bar className="mb-2 h-7 w-24" />
      <Bar className="mb-6 h-4 w-48" />

      {/* 统计卡片 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* 快速入口标题 */}
      <Bar className="mt-8 mb-4 h-6 w-20" />

      {/* 功能入口卡片 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FeatureCardSkeleton />
        <FeatureCardSkeleton />
      </div>
    </main>
  );
}
