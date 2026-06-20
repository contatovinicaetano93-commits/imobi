"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { usuariosApi } from "@/lib/api";
import { useToast } from "@/hooks/toast-context";

type PerfilAvatarProps = {
  nome: string;
  avatarUrl?: string | null;
};

export function PerfilAvatar({ nome, avatarUrl }: PerfilAvatarProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const updated = await usuariosApi.uploadAvatar(file);
      setPreview(updated.avatarUrl ?? null);
      success("Foto de perfil atualizada.");
      router.refresh();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative w-14 h-14 rounded-2xl overflow-hidden bg-[#EEF3FF] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#1B4FD8] focus:ring-offset-2 disabled:opacity-60"
        aria-label="Alterar foto de perfil"
      >
        {preview ? (
          <Image
            src={preview}
            alt={`Foto de ${nome}`}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="text-xl font-bold text-[#1B4FD8]">
            {nome.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 size={18} className="text-white animate-spin" />
          ) : (
            <Camera size={18} className="text-white" />
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
