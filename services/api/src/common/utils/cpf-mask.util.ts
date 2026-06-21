/** Masks a CPF for logs/responses: "123.456.789-00" → "***.***.789-00" */
export function maskCpf(cpf: string): string {
  if (!cpf) return '***';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***';
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Masks a bank account number, showing only last 4 digits */
export function maskConta(conta: string): string {
  if (!conta || conta.length < 4) return '****';
  return '*'.repeat(conta.length - 4) + conta.slice(-4);
}
