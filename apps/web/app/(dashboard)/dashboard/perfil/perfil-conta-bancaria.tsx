"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContaBancariaEmpresaSchema, type ContaBancariaEmpresaInput } from "@imbobi/schemas";
import { usuariosApi, type UsuarioPerfil } from "@/lib/api";
import { useToast } from "@/hooks/toast-context";

interface Props {
  usuario: UsuarioPerfil;
}

export function PerfilContaBancaria({ usuario }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, setIsPending] = useState(false);
  const cb = usuario.contaBancaria;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ContaBancariaEmpresaInput>({
    resolver: zodResolver(ContaBancariaEmpresaSchema),
    defaultValues: {
      contaTitular: cb?.titular ?? usuario.nome,
      contaBanco: cb?.banco ?? "",
      contaAgencia: cb?.agencia ?? "",
      contaNumero: cb?.numero ?? "",
      contaPix: cb?.pix ?? "",
    },
  });

  const onSubmit = async (data: ContaBancariaEmpresaInput) => {
    setIsPending(true);
    try {
      await usuariosApi.atualizarContaBancaria(data);
      success("Conta bancária da empresa salva.");
      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao salvar conta");
    } finally {
      setIsPending(false);
    }
  };

  const cadastrada = Boolean(cb?.banco && cb?.numero);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-900 mb-1">Conta bancária da empresa</h2>
      <p className="text-sm text-gray-500 mb-5">
        Pagamentos de capital por fase são feitos manualmente pelo financeiro IMOBI nesta conta.
        {cadastrada ? (
          <span className="block mt-1 text-green-700 font-medium">Conta cadastrada.</span>
        ) : (
          <span className="block mt-1 text-amber-700 font-medium">Cadastre para receber liberações.</span>
        )}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="conta-titular" className="block text-sm font-semibold text-gray-900 mb-1">Titular</label>
          <input id="conta-titular" {...register("contaTitular")} disabled={isPending} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" />
          {errors.contaTitular && <p className="text-sm text-red-600 mt-1">{errors.contaTitular.message}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="conta-banco" className="block text-sm font-semibold text-gray-900 mb-1">Banco</label>
            <input id="conta-banco" {...register("contaBanco")} disabled={isPending} placeholder="Ex: Itaú" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" />
            {errors.contaBanco && <p className="text-sm text-red-600 mt-1">{errors.contaBanco.message}</p>}
          </div>
          <div>
            <label htmlFor="conta-agencia" className="block text-sm font-semibold text-gray-900 mb-1">Agência</label>
            <input id="conta-agencia" {...register("contaAgencia")} disabled={isPending} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" />
            {errors.contaAgencia && <p className="text-sm text-red-600 mt-1">{errors.contaAgencia.message}</p>}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="conta-numero" className="block text-sm font-semibold text-gray-900 mb-1">Conta</label>
            <input id="conta-numero" {...register("contaNumero")} disabled={isPending} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" />
            {errors.contaNumero && <p className="text-sm text-red-600 mt-1">{errors.contaNumero.message}</p>}
          </div>
          <div>
            <label htmlFor="conta-pix" className="block text-sm font-semibold text-gray-900 mb-1">PIX (opcional)</label>
            <input id="conta-pix" {...register("contaPix")} disabled={isPending} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" />
            {errors.contaPix && <p className="text-sm text-red-600 mt-1">{errors.contaPix.message}</p>}
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending || !isDirty}
          className="w-full text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          style={{ background: "#1B4FD8" }}
        >
          {isPending ? "Salvando..." : "Salvar conta bancária"}
        </button>
      </form>
    </div>
  );
}
