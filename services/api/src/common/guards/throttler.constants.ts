/** Skip every named throttler in ThrottlerModule.forRoot (default + auth + upload + manager). */
export const SKIP_ALL_THROTTLES = {
  default: true,
  auth: true,
  upload: true,
  manager: true,
} as const;
