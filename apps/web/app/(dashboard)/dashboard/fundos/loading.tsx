export default function FundosLoading() {
  return (
    <div className="max-w-5xl space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gray-100 rounded-xl" />
        <div className="space-y-1.5">
          <div className="h-6 bg-gray-100 rounded-full w-40" />
          <div className="h-4 bg-gray-100 rounded-full w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="h-3 bg-gray-100 rounded-full w-1/2" />
            <div className="h-8 bg-gray-100 rounded-full w-3/4" />
            <div className="h-3 bg-gray-100 rounded-full w-2/3" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="h-5 bg-gray-100 rounded-full w-1/3" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-24 h-3 bg-gray-100 rounded-full" />
              <div className="flex-1 h-3 bg-gray-100 rounded-full" />
              <div className="w-16 h-3 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
