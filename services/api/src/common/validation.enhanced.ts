import { z } from "zod";

// Enhanced validation with custom error messages (Portuguese)
export const EnhancedSchemas = {
  email: z.string().email("Email inválido").toLowerCase().trim(),

  password: z
    .string()
    .min(8, "Senha deve ter mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter letra maiúscula")
    .regex(/[0-9]/, "Deve conter número")
    .regex(/[@$!%*?&]/, "Deve conter caractere especial"),

  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve ter 11 dígitos")
    .refine(validateCPF, "CPF inválido"),

  cnpj: z
    .string()
    .regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos")
    .refine(validateCNPJ, "CNPJ inválido"),

  telefone: z.string().regex(/^\d{11}$/, "Telefone deve ter 11 dígitos"),

  url: z.string().url("URL inválida"),

  monetario: z
    .number()
    .min(0, "Valor não pode ser negativo")
    .max(10000000, "Valor máximo excedido"),

  data: z.string().refine((val) => !isNaN(Date.parse(val)), "Data inválida"),

  latitude: z
    .number()
    .min(-90)
    .max(90)
    .refine((val) => !Number.isNaN(val), "Latitude inválida"),

  longitude: z
    .number()
    .min(-180)
    .max(180)
    .refine((val) => !Number.isNaN(val), "Longitude inválida"),
};

// CPF validation (modulo 11)
function validateCPF(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

// CNPJ validation (modulo 11)
function validateCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}
