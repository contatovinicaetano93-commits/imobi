import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as compression from "compression";

/**
 * Compression middleware for API responses
 * Automatically compresses responses larger than 1KB using gzip or brotli
 *
 * Performance impact: 30-50% response size reduction for JSON payloads
 */
@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private compressor = compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Balance between compression ratio and CPU usage
    threshold: 1024, // Only compress responses > 1KB
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.compressor(req, res, next);
  }
}
