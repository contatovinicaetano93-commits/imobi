export default function ComercialLoading() {
  return (
    <div className="max-w-5xl space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gray-100 rounded-xl" />
        <div className="space-y-1.5">
          <div className="h-6 bg-gray-100 rounded-full w-48" />
          <div className="h-4 bg-gray-100 rounded-full w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
            <div className="h-3 bg-gray-100 rounded-full w-1/2" />
            <div className="h-7 bg-gray-100 rounded-full w-3/4" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded-full w-1/3" />
                <div className="h-3 bg-gray-100 rounded-full w-1/4" />
              </div>
              <div className="w-16 h-6 bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
