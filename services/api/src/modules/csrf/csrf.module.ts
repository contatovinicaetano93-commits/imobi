import { Module, Global } from "@nestjs/common";
import { CsrfService } from "./csrf.service";
import Redis from "ioredis";

@Global()
@Module({
  providers: [
    CsrfService,
    {
      provide: "REDIS",
      useFactory: () => {
        return new Redis({
          host: process.env["REDIS_HOST"] ?? "localhost",
          port: Number(process.env["REDIS_PORT"] ?? 6379),
          db: 1, // Use database 1 for CSRF tokens (0 is for cache-manager)
        });
      },
    },
  ],
  exports: [CsrfService],
})
export class CsrfModule {}
