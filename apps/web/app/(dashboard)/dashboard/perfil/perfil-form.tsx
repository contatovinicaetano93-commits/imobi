"use client";

import { z } from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/toast-context";

const UpdatePerfilSchema = z.object({
  nome: z.string().min(3).max(120),
});

type UpdatePerfilInput = z.infer<typeof UpdatePerfilSchema>;

interface Props {
  usuario: { nome: string; email: string };
}

export function PerfilForm({ usuario }: Props) {
  const { success } = useToast();
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdatePerfilInput>({
    resolver: zodResolver(UpdatePerfilSchema),
    defaultValues: { nome: usuario.nome },
  });

  const onSubmit = async (_data: UpdatePerfilInput) => {
    setIsPending(true);
    try {
      success("Perfil atualizado localmente. Sincronização completa em breve.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Nome
        <input {...register("nome")} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
        {errors.nome && <span className="text-xs text-red-600">{errors.nome.message}</span>}
      </label>
      <p className="text-sm text-gray-500">E-mail: {usuario.email}</p>
      <button
        type="submit"
        disabled={!isDirty || isPending}
        className="rounded-xl bg-[#1B4FD8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
