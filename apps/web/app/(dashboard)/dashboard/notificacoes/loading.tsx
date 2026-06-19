export default function NotificacoesLoading() {
  return (
    <div className="max-w-2xl space-y-4 animate-pulse">
      <div className="h-7 w-44 bg-gray-200 rounded-lg" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}
