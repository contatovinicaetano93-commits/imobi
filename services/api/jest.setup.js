// Set test environment variables
process.env.ENCRYPTION_SECRET = 'test-encryption-secret-1234567890123456';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-must-be-long-enough-64-chars-minimum-12345';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-must-be-long-enough-64-chars-minimum12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '4000';
