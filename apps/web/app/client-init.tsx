"use client";

import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";

export function ClientInit() {
  useEffect(() => {
    initSentry();
  }, []);
  return null;
}
