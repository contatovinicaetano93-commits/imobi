"use client";

import { redirect } from "next/navigation";

export function AdminPagamentosPanel() {
  redirect("/dashboard/admin/tranches");
  return null;
}
