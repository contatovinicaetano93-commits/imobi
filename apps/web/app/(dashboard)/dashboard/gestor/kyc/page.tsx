"use client";

import { KycFilaClient } from "@/app/(dashboard)/_components/kyc/KycFilaClient";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useRedirectAdminFromGestorRoute } from "@/hooks/useRedirectAdminFromGestorRoute";

export default function GestorKycPage() {
  const redirecting = useRedirectAdminFromGestorRoute("/dashboard/admin/kyc");
  if (redirecting) return <PageSkeleton variant="list" showHeader={false} />;
  return <KycFilaClient context="gestor" />;
}
