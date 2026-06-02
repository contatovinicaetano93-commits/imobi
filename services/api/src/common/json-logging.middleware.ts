import { Injectable, NestMiddleware } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";

/**
 * JSON Logging Middleware
 * Logs structured JSON data for HTTP requests and responses to CloudWatch.
 *
 * Log Format (CloudWatch JSON Insights compatible):
 * {
 *   timestamp: ISO-8601 string,
 *   level: "info" | "warn" | "error",
 *   message: "METHOD PATH STATUS_CODE",
 *   path: "/api/v1/...",
 *   method: "GET|POST|PUT|DELETE|PATCH",
 *   statusCode: number,
 *   duration: milliseconds,
 *   userId: string | null,
 *   requestId: UUID string (from RequestIdMiddleware),
 *   traceId: UUID string (from RequestIdMiddleware),
 *   error?: string (only for 4xx/5xx responses)
 * }
 *
 * This middleware:
 * - Logs all incoming HTTP requests at the end of processing
 * - Captures response status code and duration for latency metrics
 * - Formats logs as structured JSON for CloudWatch Insights queries
 * - Extracts userId from JWT context when available (set by auth guards)
 * - Tracks request/trace IDs for distributed tracing
 * - Includes error messages for failed requests (4xx/5xx)
 * - Used by CloudWatch Alarms and Dashboard for observability
 *
 * CloudWatch Insights Query Examples:
 * - Error rate: fields statusCode | stats count(*) as total, count(statusCode=500) as errors
 * - Slow requests: fields duration, path | filter duration > 1000 | stats avg(duration) by path
 * - User activity: fields userId, method, path | filter userId is not null
 */
@Injectable()
export class JsonLoggingMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: any) {
    // Capture response start time (already set by RequestIdMiddleware)
    const reqWithMetadata = req as any;
    const startTime = reqWithMetadata.startTime || Date.now();
    const requestId = reqWithMetadata.id || "unknown";
    const traceId = reqWithMetadata.traceId || "unknown";

    // Intercept response.send to log after response is sent
    const originalSend = res.send.bind(res);

    res.send = function (payload: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode || 200;
      const method = req.method || "UNKNOWN";
      const path = req.url || "unknown";

      // Extract userId from request context if available (set by auth guards)
      const userId = (req as any).user?.id || null;

      // Determine log level based on status code
      let level = "info";
      if (statusCode >= 400 && statusCode < 500) {
        level = "warn";
      } else if (statusCode >= 500) {
        level = "error";
      }

      // Try to extract error message if payload is an error response
      let errorMessage = null;
      if (statusCode >= 400 && typeof payload === "object" && payload !== null) {
        errorMessage = (payload as any).message || (payload as any).error || null;
      }

      // Structured JSON log entry
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: `${method} ${path} ${statusCode}`,
        path,
        method,
        statusCode,
        duration,
        userId,
        requestId,
        traceId,
        ...(errorMessage && { error: errorMessage }),
      };

      // Log to stdout (CloudWatch will capture this)
      console.log(JSON.stringify(logEntry));

      // Call original send
      return originalSend(payload);
    };

    next();
  }
}
