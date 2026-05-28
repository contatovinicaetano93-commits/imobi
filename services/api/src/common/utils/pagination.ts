/**
 * Cursor-based pagination utilities
 * More efficient than offset-based pagination for large datasets
 *
 * Cursor pagination: O(1) query time regardless of page number
 * Offset pagination: O(n) query time increases with page number
 */

export interface PaginationParams {
  cursor?: string; // Base64 encoded ID of last item from previous page
  limit?: number; // Items per page, default 20, max 100
  sortBy?: "desc" | "asc"; // Sort order, default desc (newest first)
}

export interface PaginationResponse<T> {
  items: T[];
  nextCursor?: string; // Cursor for next page, absent if at end
  hasMore: boolean;
  count: number;
}

/**
 * Parse pagination params from query
 */
export function parsePaginationParams(query: any): PaginationParams {
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const cursor = query.cursor ? Buffer.from(query.cursor, "base64").toString() : undefined;
  const sortBy = query.sortBy === "asc" ? "asc" : "desc";

  return { cursor, limit, sortBy };
}

/**
 * Generate cursor from item ID for next page
 */
export function generateNextCursor(itemId: string): string {
  return Buffer.from(itemId).toString("base64");
}

/**
 * Format paginated response
 */
export function formatPaginationResponse<T>(
  items: T[],
  limit: number,
  getIdFn: (item: T) => string
): PaginationResponse<T> {
  const hasMore = items.length > limit;
  const returnItems = items.slice(0, limit);

  return {
    items: returnItems,
    nextCursor: hasMore ? generateNextCursor(getIdFn(returnItems[limit - 1])) : undefined,
    hasMore,
    count: returnItems.length,
  };
}

/**
 * Build Prisma where clause for cursor-based pagination
 * Usage: where: buildCursorWhere(cursor, "usuarioId")
 */
export function buildCursorWhere(cursor: string | undefined, cursorField: string = "usuarioId") {
  if (!cursor) return {};

  return {
    [cursorField]: {
      lt: cursor, // For desc ordering: less than cursor
    },
  };
}

/**
 * Pagination configuration constants
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
};
