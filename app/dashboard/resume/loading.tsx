export default function ResumeLoading() {
  return (
    <div className="w-full animate-pulse">
      <div className="flex w-full items-center justify-between mb-6">
        <div className="h-8 w-32 rounded-md bg-gray-200" />
        <div className="h-9 w-32 rounded-lg bg-gray-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="h-5 w-3/4 rounded bg-gray-200" />
              <div className="h-5 w-16 rounded-full bg-gray-200" />
            </div>
            <div className="h-8 w-1/3 rounded bg-gray-200" />
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-7 w-16 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
