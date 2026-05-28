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

// Mock PrismaClient to avoid database connection errors in tests
const createMockPrismaClient = () => {
  const mockUsuario = {
    create: jest.fn(async (args) => {
      return {
        usuarioId: 'test-usuario-id',
        email: args.data.email,
        nome: args.data.nome,
        cpf: args.data.cpf,
        cpfHash: 'test-hash',
        telefone: args.data.telefone,
        passwordHash: args.data.passwordHash,
        tipo: args.data.tipo || 'TOMADOR',
        kycStatus: 'PENDENTE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    deleteMany: jest.fn(async () => ({ count: 0 })),
    update: jest.fn(async (args) => args.data),
  };

  const mockPrismaClient = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    usuario: mockUsuario,
    kycDocumento: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      findMany: jest.fn(async () => []),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    obra: {
      create: jest.fn(),
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    etapaObra: {
      createMany: jest.fn(async () => ({ count: 0 })),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(),
    },
    sessaoToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  return mockPrismaClient;
};

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn(() => createMockPrismaClient()),
  };
});

// Mock redis to avoid connection errors in tests
jest.mock('redis', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(0),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  };

  return {
    createClient: jest.fn(() => mockRedisClient),
  };
});
