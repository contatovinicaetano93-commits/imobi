export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorMetadata {
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  statusCode: number;
}

export class ErrorCategorizerUtil {
  static categorize(status: number, error: any): ErrorMetadata {
    if (status >= 400 && status < 500) {
      return this.categorizeClientError(status, error);
    }

    if (status >= 500) {
      return this.categorizeServerError(status, error);
    }

    return {
      category: ErrorCategory.UNKNOWN,
      severity: 'low',
      retryable: false,
      statusCode: status,
    };
  }

  private static categorizeClientError(status: number, error: any): ErrorMetadata {
    switch (status) {
      case 400:
        return {
          category: ErrorCategory.VALIDATION,
          severity: 'low',
          retryable: false,
          statusCode: status,
        };
      case 401:
        return {
          category: ErrorCategory.AUTHENTICATION,
          severity: 'medium',
          retryable: false,
          statusCode: status,
        };
      case 403:
        return {
          category: ErrorCategory.AUTHORIZATION,
          severity: 'medium',
          retryable: false,
          statusCode: status,
        };
      case 404:
        return {
          category: ErrorCategory.NOT_FOUND,
          severity: 'low',
          retryable: false,
          statusCode: status,
        };
      case 409:
        return {
          category: ErrorCategory.CONFLICT,
          severity: 'medium',
          retryable: false,
          statusCode: status,
        };
      case 429:
        return {
          category: ErrorCategory.RATE_LIMIT,
          severity: 'medium',
          retryable: true,
          statusCode: status,
        };
      default:
        return {
          category: ErrorCategory.UNKNOWN,
          severity: 'medium',
          retryable: false,
          statusCode: status,
        };
    }
  }

  private static categorizeServerError(status: number, error: any): ErrorMetadata {
    const message = this.getErrorMessage(error);

    if (this.isDatabaseError(message)) {
      return {
        category: ErrorCategory.DATABASE,
        severity: 'high',
        retryable: true,
        statusCode: status,
      };
    }

    if (this.isExternalServiceError(message)) {
      return {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: 'high',
        retryable: true,
        statusCode: status,
      };
    }

    return {
      category: ErrorCategory.UNKNOWN,
      severity: 'critical',
      retryable: false,
      statusCode: status,
    };
  }

  private static getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.toString) return error.toString();
    return '';
  }

  private static isDatabaseError(message: string): boolean {
    const dbKeywords = ['database', 'connection', 'query', 'pool', 'prisma', 'sql'];
    return dbKeywords.some((keyword) => message.toLowerCase().includes(keyword));
  }

  private static isExternalServiceError(message: string): boolean {
    const externalKeywords = ['axios', 'http', 'fetch', 'api', 'service', 's3', 'aws'];
    return externalKeywords.some((keyword) => message.toLowerCase().includes(keyword));
  }
}
