export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatarCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatarTelefone(tel: string): string {
  if (tel.length === 11) {
    return tel.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return tel.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

export function formatarCEP(cep: string): string {
  return cep.replace(/(\d{5})(\d{3})/, "$1-$2");
}

export function formatarPercentual(valor: number, casas = 1): string {
  return `${valor.toFixed(casas)}%`;
}

export function formatarArea(m2: number): string {
  return `${m2.toLocaleString("pt-BR")} m²`;
}
