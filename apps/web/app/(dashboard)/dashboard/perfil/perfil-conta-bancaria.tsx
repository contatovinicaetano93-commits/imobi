"use client";

export function PerfilContaBancaria({ usuario }: { usuario: { nome: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
      Conta bancária será configurada na próxima etapa do fluxo de crédito para <strong>{usuario.nome}</strong>.
    </div>
  );
}
