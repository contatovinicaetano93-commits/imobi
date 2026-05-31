"use client";

import { ReactNode, useState } from "react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => ReactNode;
  width?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  sortBy?: { key: string; direction: "asc" | "desc" };
  onSort?: (key: string) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  empty,
  onRowClick,
  loading,
  sortBy,
  onSort,
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    sortBy || null
  );

  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        {empty || (
          <>
            <p className="text-gray-400 text-sm">Nenhum resultado encontrado</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-6 py-3 text-left text-sm font-semibold text-gray-700 ${
                  column.width || ""
                }`}
              >
                <div className="flex items-center gap-2 cursor-pointer">
                  {column.label}
                  {column.sortable && (
                    <button
                      onClick={() => handleSort(String(column.key))}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label={`Sort by ${column.label}`}
                    >
                      ↕
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row)}
              className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                onRowClick ? "cursor-pointer" : ""
              }`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className={`px-6 py-4 text-sm text-gray-900`}>
                  {column.render
                    ? column.render((row as any)[String(column.key)], row)
                    : (row as any)[String(column.key)]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
