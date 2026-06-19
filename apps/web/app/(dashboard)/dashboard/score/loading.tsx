export default function ScoreLoading() {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-4">
        <div className="h-32 w-32 bg-gray-200 rounded-full" />
        <div className="h-6 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-48 bg-gray-100 rounded" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-4 w-12 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
