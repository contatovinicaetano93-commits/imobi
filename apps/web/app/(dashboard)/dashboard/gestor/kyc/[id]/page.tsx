"use client";

import { useParams } from "next/navigation";
import type { Route } from "next";
import { KycDetailClient } from "@/app/(dashboard)/_components/kyc/KycDetailClient";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useRedirectAdminFromGestorRoute } from "@/hooks/useRedirectAdminFromGestorRoute";

export default function GestorKycDetailPage() {
  const params = useParams();
  const docId = Array.isArray(params.id) ? params.id[0] : params.id;
  const redirecting = useRedirectAdminFromGestorRoute(
    `/dashboard/admin/kyc/${docId}` as Route,
  );
  if (redirecting) return <PageSkeleton variant="detail" />;
  return <KycDetailClient context="gestor" />;
}
