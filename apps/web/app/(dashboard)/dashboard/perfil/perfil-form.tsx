"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdatePerfilUsuarioSchema, type UpdatePerfilUsuarioInput } from "@imbobi/schemas";
import { usuariosApi, type UsuarioPerfil } from "@/lib/api";
import { formatarTelefone } from "@imbobi/core";
import { useToast } from "@/hooks/toast-context";

interface Props {
  usuario: UsuarioPerfil;
}

export function PerfilForm({ usuario }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdatePerfilUsuarioInput>({
    resolver: zodResolver(UpdatePerfilUsuarioSchema),
    defaultValues: {
      nome: usuario.nome,
      telefone: usuario.telefone,
    },
  });

  const onSubmit = async (data: UpdatePerfilUsuarioInput) => {
    setIsPending(true);
    try {
      await usuariosApi.atualizarPerfil(data);
      success("Perfil atualizado com sucesso.");
      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao atualizar perfil");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="perfil-nome" className="block text-sm font-semibold text-gray-900 mb-2">
          Nome completo
        </label>
        <input
          id="perfil-nome"
          type="text"
          autoComplete="name"
          {...register("nome")}
          disabled={isPending}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent outline-none disabled:opacity-50"
        />
        {errors.nome && (
          <p className="text-sm text-red-600 mt-1" role="alert">{errors.nome.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="perfil-telefone" className="block text-sm font-semibold text-gray-900 mb-2">
          Telefone
        </label>
        <input
          id="perfil-telefone"
          type="tel"
          autoComplete="tel"
          {...register("telefone")}
          disabled={isPending}
          placeholder="(11) 99999-9999"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent outline-none disabled:opacity-50"
        />
        {usuario.telefone && !errors.telefone && (
          <p className="text-xs text-gray-400 mt-1">
            Atual: {formatarTelefone(usuario.telefone)}
          </p>
        )}
      {errors.telefone && (
        <p className="text-sm text-red-600 mt-1" role="alert">{errors.telefone.message}</p>
      )}
    </div>

    <button
        type="submit"
        disabled={isPending || !isDirty}
        className="w-full text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8] focus:ring-offset-2"
        style={{ background: "#1B4FD8" }}
      >
        {isPending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
