export default function AuditLogsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-36 bg-gray-200 rounded-lg" />
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-gray-100 rounded-xl" />
        <div className="h-10 w-40 bg-gray-100 rounded-xl" />
        <div className="h-10 w-36 bg-gray-100 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-4 border-b border-gray-50">
            <div className="h-6 w-6 bg-gray-200 rounded-full mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-28 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
