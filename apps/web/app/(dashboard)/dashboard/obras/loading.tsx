export default function ObrasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-gray-200 rounded-lg" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-28 bg-gray-200 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-5 w-20 bg-gray-100 rounded-full" />
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-gray-200 rounded-full w-2/3" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
