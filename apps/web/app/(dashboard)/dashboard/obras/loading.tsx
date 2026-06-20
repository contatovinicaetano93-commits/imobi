import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";

export default function ObrasLoading() {
  return <PageSkeleton variant="cards" count={4} />;
}
