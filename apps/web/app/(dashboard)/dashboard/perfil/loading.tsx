export default function PerfilLoading() {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      <div className="h-7 w-20 bg-gray-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-gray-200 rounded-full" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-52 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-20 bg-gray-100 rounded" />
              <div className="h-10 w-full bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
