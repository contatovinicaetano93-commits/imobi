import { ThrottlerModuleOptions } from "@nestjs/throttler";

export const throttleConfig: ThrottlerModuleOptions = [
  {
    name: "global",
    ttl: 60000,
    limit: 100,
  },
  {
    name: "auth",
    ttl: 60000,
    limit: 5,
  },
  {
    name: "kyc",
    ttl: 60000,
    limit: 10,
  },
  {
    name: "upload",
    ttl: 60000,
    limit: 20,
  },
  {
    name: "read",
    ttl: 60000,
    limit: 200,
  },
];

export const THROTTLE_LIMITS = {
  GLOBAL: 100,
  AUTH: 5,
  KYC: 10,
  UPLOAD: 20,
  READ: 200,
};
