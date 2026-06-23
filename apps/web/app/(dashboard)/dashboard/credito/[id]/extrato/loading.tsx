export default function ExtratoLoading() {
  return (
    <div className="max-w-5xl space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 rounded-lg" />
          <div className="h-10 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Title */}
      <div>
        <div className="h-8 w-64 bg-gray-200 rounded mb-2" />
        <div className="h-5 w-96 bg-gray-100 rounded" />
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-6 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-6 w-28 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="h-5 w-40 bg-gray-200 rounded" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-100 flex gap-4">
              <div className="h-4 w-12 bg-gray-100 rounded flex-shrink-0" />
              <div className="h-4 w-24 bg-gray-100 rounded flex-shrink-0" />
              <div className="flex-1 space-y-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
