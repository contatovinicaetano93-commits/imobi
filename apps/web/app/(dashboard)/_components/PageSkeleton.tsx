type PageSkeletonVariant = "default" | "list" | "cards" | "stats" | "timeline" | "detail";

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  count?: number;
  showHeader?: boolean;
  className?: string;
}

function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className ?? ""}`} />;
}

function ListItemSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <Bar className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2.5 pt-0.5">
          <Bar className="h-3.5 rounded-full w-2/3" />
          <Bar className="h-3 rounded-full w-full" />
          <Bar className="h-3 rounded-full w-1/4" />
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse space-y-4">
      <div className="flex items-start justify-between gap-4">
        <Bar className="h-5 rounded w-1/2" />
        <Bar className="h-6 w-20 rounded-full" />
      </div>
      <Bar className="h-3 rounded w-3/4" />
      <Bar className="h-2 rounded-full w-full" />
      <div className="flex gap-3 pt-1">
        <Bar className="h-8 w-24 rounded-lg" />
        <Bar className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

function TimelineItemSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
      <div className="flex gap-4">
        <Bar className="w-5 h-5 rounded shrink-0" />
        <Bar className="w-1.5 h-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Bar className="h-4 rounded w-1/2" />
          <Bar className="h-3 rounded w-1/3" />
          <Bar className="h-3 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
      <Bar className="h-3 rounded w-1/2" />
      <Bar className="h-7 rounded w-2/3" />
      <Bar className="h-2 rounded w-full" />
    </div>
  );
}

export function PageSkeleton({
  variant = "default",
  count = 3,
  showHeader = true,
  className,
}: PageSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className={`space-y-6 ${className ?? ""}`} aria-busy="true" aria-label="Carregando">
      {showHeader && (
        <div className="flex items-center justify-between gap-4 animate-pulse">
          <div className="space-y-2">
            <Bar className="h-8 rounded w-48" />
            <Bar className="h-4 rounded w-64" />
          </div>
          <Bar className="h-10 w-32 rounded-xl shrink-0 hidden sm:block" />
        </div>
      )}

      {variant === "stats" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      )}

      {variant === "list" && (
        <div className="space-y-3">
          {items.map((i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      )}

      {variant === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {variant === "timeline" && (
        <div className="space-y-4">
          {items.map((i) => (
            <TimelineItemSkeleton key={i} />
          ))}
        </div>
      )}

      {variant === "detail" && (
        <div className="space-y-6 animate-pulse">
          <Bar className="h-10 rounded w-2/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Bar className="h-64 rounded-2xl" />
              <Bar className="h-40 rounded-2xl" />
            </div>
            <Bar className="h-72 rounded-2xl" />
          </div>
        </div>
      )}

      {variant === "default" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
          <Bar className="h-64 rounded-2xl animate-pulse" />
        </>
      )}
    </div>
  );
}
