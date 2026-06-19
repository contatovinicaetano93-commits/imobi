export default function RelatoriosLoading() {
  return (
    <div className="max-w-4xl space-y-6 animate-pulse">
      <div className="h-7 w-36 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-20 bg-gray-300 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded" />
        <div className="h-48 w-full bg-gray-100 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="h-5 w-36 bg-gray-200 rounded" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
            <div className="h-4 w-28 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
