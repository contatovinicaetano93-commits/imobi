"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usuariosApi, type UsuarioPerfil } from "@/lib/api";
import { formatarTelefone } from "@imbobi/core";

const schema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  telefone: z.string().min(10, "Telefone inválido"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  usuario: UsuarioPerfil;
}

export function PerfilForm({ usuario }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: usuario.nome,
      telefone: usuario.telefone,
    },
  });

  const onSubmit = async (data: FormData) => {
    setErro(null);
    setSucesso(false);

    setIsPending(true);
    try {
      await usuariosApi.atualizarPerfil({
        nome: data.nome,
        telefone: data.telefone,
      });
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
      router.refresh();
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro ao atualizar perfil"
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Nome */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Nome Completo
        </label>
        <input
          type="text"
          {...register("nome")}
          disabled={isPending}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
        />
        {errors.nome && (
          <p className="text-sm text-red-600 mt-1">{errors.nome.message}</p>
        )}
      </div>

      {/* Telefone */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Telefone
        </label>
        <input
          type="tel"
          {...register("telefone")}
          disabled={isPending}
          placeholder="(11) 99999-9999"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
        />
        {errors.telefone && (
          <p className="text-sm text-red-600 mt-1">{errors.telefone.message}</p>
        )}
      </div>

      {/* Mensagens */}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {sucesso && (
        <p className="text-sm text-green-600">Perfil atualizado com sucesso!</p>
      )}

      {/* Botão */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors hover:opacity-90"
        style={{ background: "#1B4FD8" }}
      >
        {isPending ? "Salvando..." : "Salvar Alterações"}
      </button>
    </form>
  );
}
