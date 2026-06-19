export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-gray-100 rounded" />
              <div className="h-9 w-9 bg-gray-100 rounded-xl" />
            </div>
            <div className="h-7 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[260, 220].map((h, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" style={{ minHeight: h }}>
            <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between py-3 border-b border-gray-50">
                <div className="h-4 w-40 bg-gray-100 rounded" />
                <div className="h-4 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
