import { DocumentBuilder } from "@nestjs/swagger";

/**
 * Swagger/OpenAPI configuration for imobi API
 * Defines the API specification, security schemes, and documentation structure
 */
export function getSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle("imobi API")
    .setDescription(
      "Fintech de crédito inteligente para construção civil. " +
        "Financiamento com liberação por etapas validadas por GPS e fotos geovalidadas.",
    )
    .setVersion("1.0.0")
    .setContact("imobi Support", "https://imbobi.com/support", "api@imbobi.com")
    .setLicense("Commercial", "https://imbobi.com/terms")
    .addServer("http://localhost:4000/api/v1", "Local Development")
    .addServer("https://api-staging.imbobi.com/api/v1", "Staging Environment")
    .addServer("https://api.imbobi.com/api/v1", "Production")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Acesso protegido usando JWT Bearer token. " +
          "Token deve ser enviado no header: Authorization: Bearer <token>",
      },
      "access-token",
    )
    .addCookieAuth(
      "refreshToken",
      {
        type: "apiKey",
        in: "cookie",
        description:
          "RefreshToken armazenado como HttpOnly cookie (apenas servidor). " +
          "Usado para renovar accessToken expirado.",
      },
      "refresh-token",
    )
    .addTag(
      "Authentication",
      "Endpoints de autenticação e gerenciamento de tokens",
    )
    .addTag("Users", "Gerenciamento de perfil e dados de usuário")
    .addTag("Credit", "Simulador de crédito e requisições de financiamento")
    .addTag("KYC", "Know Your Customer - validação de identidade")
    .addTag("Evidências", "Fotos geovalidadas de obras")
    .addTag("Obras", "Projetos de construção e etapas")
    .addTag("Notifications", "Notificações e avisos")
    .addTag("Health", "Status da API")
    .build();
}

export const SWAGGER_ENDPOINTS = {
  auth: {
    registrar: {
      summary: "Registrar novo usuário",
      description:
        "Cria uma nova conta com email, CPF e dados básicos. " +
        "CPF é validado com modulo-11. Email deve ser único. " +
        "RefreshToken é armazenado como HttpOnly cookie seguro.",
      example: {
        request: {
          nome: "João da Silva",
          cpf: "12345678901",
          telefone: "11999999999",
          email: "joao@imbobi.com",
          senha: "MinhaSenh@123",
          tipo: "TOMADOR",
        },
        response: {
          usuario: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "joao@imbobi.com",
            nome: "João da Silva",
            cpf: "12345678901",
            tipo: "TOMADOR",
            kyc: {
              status: "NENHUM",
              documents: [],
            },
          },
          accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
      },
      errors: [
        "400: CPF inválido (modulo-11) ou duplicado",
        "400: Email duplicado no sistema",
        "400: Senha deve ter mín. 8 caracteres",
        "400: Email inválido",
        "429: Rate limit (10 registros/min)",
      ],
    },
    login: {
      summary: "Login de usuário",
      description:
        "Autentica usuário com email e senha. " +
        "Retorna accessToken (JWT) e refreshToken (HttpOnly cookie). " +
        "AccessToken expira em 15 minutos, refreshToken em 7 dias.",
      example: {
        request: {
          email: "joao@imbobi.com",
          senha: "MinhaSenh@123",
        },
        response: {
          usuario: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "joao@imbobi.com",
            nome: "João da Silva",
          },
          accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
      },
      errors: [
        "401: Email ou senha incorretos",
        "429: Rate limit (10 tentativas/min)",
      ],
    },
    renovar: {
      summary: "Renovar accessToken",
      description:
        "Usa refreshToken válido para obter novo accessToken. " +
        "RefreshToken pode ser enviado no body ou recuperado do cookie. " +
        "Um novo refreshToken também é gerado (token rotation).",
      example: {
        request: {
          refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        response: {
          accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
      },
      errors: [
        "401: RefreshToken inválido ou expirado",
        "401: RefreshToken foi revogado (logout anterior)",
        "429: Rate limit (10 renovações/min)",
      ],
    },
    logout: {
      summary: "Logout de usuário",
      description:
        "Revoga o refreshToken. Usuário não poderá renovar tokens após logout. " +
        "Cookie refreshToken é removido.",
      example: {
        request: {
          refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        response: "204 No Content",
      },
      errors: ["400: RefreshToken não fornecido"],
    },
  },
};
