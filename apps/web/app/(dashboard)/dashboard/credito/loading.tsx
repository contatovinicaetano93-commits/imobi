export default function CreditoLoading() {
  return (
    <div className="max-w-4xl space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 bg-gray-100 rounded-xl" />
        <div className="space-y-1.5">
          <div className="h-6 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-44 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-7 w-36 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between py-3 border-b border-gray-50">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
