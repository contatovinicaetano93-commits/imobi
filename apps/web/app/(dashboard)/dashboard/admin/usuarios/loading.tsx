export default function AdminUsuariosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-blue-100 rounded-xl" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-gray-100 rounded-xl" />
        <div className="h-10 w-32 bg-gray-100 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex gap-4">
          {["name", "email", "role", "status", "actions"].map((_, i) => (
            <div key={i} className="h-4 w-20 bg-gray-200 rounded" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50">
            <div className="h-8 w-8 bg-gray-200 rounded-full" />
            <div className="h-4 w-32 bg-gray-200 rounded flex-1" />
            <div className="h-4 w-40 bg-gray-100 rounded" />
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
            <div className="h-8 w-8 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
