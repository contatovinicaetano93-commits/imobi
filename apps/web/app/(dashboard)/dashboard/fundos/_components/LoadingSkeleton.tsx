export function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded-lg" />
        <div className="h-4 w-40 bg-gray-200 rounded-lg" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* ROI and Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-8 w-40 bg-gray-200 rounded" />
              <div className="h-2 w-full bg-gray-100 rounded-full" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-96 bg-gray-100 rounded-lg" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-96 bg-gray-100 rounded-lg" />
      </div>

      {/* Report Export */}
      <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-2xl border border-brand-200 p-6">
        <div className="h-5 w-40 bg-brand-300 rounded mb-2" />
        <div className="h-4 w-96 bg-brand-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-brand-200 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
