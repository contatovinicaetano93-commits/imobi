/**
 * Next 14 + typedRoutes can type navigation hooks as nullable during static analysis.
 * In client components (inside Suspense) they are always defined at runtime.
 */
import type { ReadonlyURLSearchParams } from "next/navigation";

declare module "next/navigation" {
  export function useSearchParams(): ReadonlyURLSearchParams;
  export function useParams<T extends Record<string, string | string[] | undefined> = Record<
    string,
    string | string[]
  >>(): T;
  export function usePathname(): string;
}
