export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl p-6 h-32" />
        ))}
      </div>
      <div className="bg-gray-100 rounded-2xl h-64" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center justify-between px-6 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-20 ml-4" />
        </div>
      ))}
    </div>
  );
}
