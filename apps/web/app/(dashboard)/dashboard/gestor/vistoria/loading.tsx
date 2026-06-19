export default function VistoriaGestorLoading() {
  return (
    <div className="max-w-3xl space-y-5 animate-pulse">
      <div className="h-7 w-36 bg-gray-200 rounded-lg" />
      <div className="h-4 w-64 bg-gray-100 rounded" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-5 w-24 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 w-56 bg-gray-100 rounded" />
          <div className="flex gap-2">
            <div className="h-9 flex-1 bg-gray-100 rounded-xl" />
            <div className="h-9 w-32 bg-gray-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
