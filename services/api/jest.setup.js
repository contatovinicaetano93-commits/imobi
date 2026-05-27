// Set test environment variables
process.env.ENCRYPTION_SECRET = 'test-encryption-secret-1234567890123456';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-must-be-long-enough-64-chars-minimum';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
