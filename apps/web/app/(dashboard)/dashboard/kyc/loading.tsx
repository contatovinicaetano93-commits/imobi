export default function KycLoading() {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      <div className="h-7 w-44 bg-gray-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="h-5 w-36 bg-gray-200 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-6 w-20 bg-gray-300 rounded-full" />
          </div>
        ))}
      </div>
      <div className="h-40 w-full bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200" />
    </div>
  );
}
