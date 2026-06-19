export default function SimuladorLoading() {
  return (
    <div className="max-w-xl space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-100 rounded-xl" />
          </div>
        ))}
        <div className="h-11 w-full bg-blue-100 rounded-xl" />
      </div>
    </div>
  );
}
