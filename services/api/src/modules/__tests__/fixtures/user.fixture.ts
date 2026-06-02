import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";

/**
 * Fixture: Valid CPF for testing (generated via validation)
 * Real CPF format: 11 digits with check digits
 */
const VALID_CPF = "12345678901"; // Note: In prod, this should be generated/mocked

/**
 * Fixture: Valid CNPJ for testing
 */
const VALID_CNPJ = "11222333000181";

export const userFixtures = {
  validCadastro: {
    nome: "João Silva Test",
    cpf: VALID_CPF,
    cnpj: VALID_CNPJ,
    email: "joao.silva@test.com",
    telefone: "11987654321",
    senha: "SecurePassword123",
    tipo: "TOMADOR" as const,
  },

  validLogin: {
    email: "joao.silva@test.com",
    senha: "SecurePassword123",
  },

  invalidCadastro: {
    // Missing required fields
    nome: "J", // Too short
    cpf: "invalid-cpf",
    email: "invalid-email",
    telefone: "123", // Too short
    senha: "weak", // Too short
  },

  invalidLogin: {
    email: "invalid-email@",
    senha: "short", // Too short
  },

  cadastroWithoutEmail: {
    nome: "Test User",
    cpf: VALID_CPF,
    email: "", // Invalid email
    telefone: "11987654321",
    senha: "SecurePassword123",
  },

  cadastroWithWeakPassword: {
    nome: "Test User",
    cpf: VALID_CPF,
    email: "test@example.com",
    telefone: "11987654321",
    senha: "weakpass", // No uppercase or number
  },

  /**
   * Generate a valid cadastro fixture with custom overrides
   */
  generateCadastro: (overrides: Partial<typeof userFixtures.validCadastro> = {}) => ({
    ...userFixtures.validCadastro,
    ...overrides,
  }),

  /**
   * Generate a valid login fixture with custom overrides
   */
  generateLogin: (overrides: Partial<typeof userFixtures.validLogin> = {}) => ({
    ...userFixtures.validLogin,
    ...overrides,
  }),
};
