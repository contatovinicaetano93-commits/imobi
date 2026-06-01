export class DataRedactionUtil {
  private static readonly SENSITIVE_FIELDS = [
    'senha',
    'password',
    'token',
    'refreshToken',
    'accessToken',
    'cpf',
    'cnpj',
    'creditCard',
    'bankAccount',
    'apiKey',
    'secret',
  ];

  private static readonly REDACTION_PATTERN = '***REDACTED***';

  static redact(data: any, depth = 0, maxDepth = 10): any {
    if (depth > maxDepth || data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redact(item, depth + 1, maxDepth));
    }

    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        redacted[key] = this.REDACTION_PATTERN;
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redact(value, depth + 1, maxDepth);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  private static isSensitiveField(fieldName: string): boolean {
    const lower = fieldName.toLowerCase();
    return this.SENSITIVE_FIELDS.some((field) => lower.includes(field));
  }

  static redactUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');
      const params = new URLSearchParams(urlObj.search);

      for (const [key] of params) {
        if (this.isSensitiveField(key)) {
          params.set(key, this.REDACTION_PATTERN);
        }
      }

      urlObj.search = params.toString();
      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  }
}
