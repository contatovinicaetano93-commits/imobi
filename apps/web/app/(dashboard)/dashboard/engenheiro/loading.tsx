export default function EngenheiroLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-100 rounded-xl" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="h-6 w-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="h-5 w-36 bg-gray-200 rounded mb-2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 w-full bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
