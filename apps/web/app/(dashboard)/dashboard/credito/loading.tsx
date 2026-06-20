import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";

export default function CreditoLoading() {
  return <PageSkeleton variant="stats" count={4} showHeader />;
}
