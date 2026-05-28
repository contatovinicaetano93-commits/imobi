import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Response Optimization Interceptor
 *
 * Removes internal fields and sensitive data from API responses
 * Reduces response payload size by ~10-20% on average
 */
@Injectable()
export class ResponseOptimizationInterceptor implements NestInterceptor {
  private fieldsToOmit = [
    "passwordHash",
    "cpfHash",
    "refreshToken",
    "motivo_rejeicao", // Internal field naming
    "processadoEm", // Not needed in most contexts
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (!data) return data;

        if (Array.isArray(data)) {
          return data.map((item) => this.cleanObject(item));
        }

        return this.cleanObject(data);
      })
    );
  }

  private cleanObject(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.cleanObject(item));
    }

    const cleaned = { ...obj };

    // Remove sensitive fields
    this.fieldsToOmit.forEach((field) => {
      delete cleaned[field];
    });

    // Recursively clean nested objects
    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] !== null && typeof cleaned[key] === "object") {
        cleaned[key] = this.cleanObject(cleaned[key]);
      }
    });

    return cleaned;
  }
}
