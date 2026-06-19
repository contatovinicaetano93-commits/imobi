export default function ComiteLoading() {
  return (
    <div className="max-w-3xl space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gray-100 rounded-xl" />
        <div className="space-y-1.5">
          <div className="h-6 bg-gray-100 rounded-full w-48" />
          <div className="h-4 bg-gray-100 rounded-full w-32" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2.5 pt-0.5">
                <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                <div className="h-3 bg-gray-100 rounded-full w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
