"use client";

import { useState, useRef } from "react";

export function UploadEvidenciaForm({ etapaId }: { etapaId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const file = fileInput.current?.files?.[0];
      if (!file) throw new Error("Selecione uma foto");

      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(new Error(`GPS: ${err.message}`))
        );
      });

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const res = await fetch(`/api/etapas/${etapaId}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapaId,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracyMetros: position.accuracy,
          foto: base64,
        }),
      });

      if (!res.ok) throw new Error("Erro ao enviar foto");
      setSuccess(true);
      if (fileInput.current) fileInput.current.value = "";
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Enviar Evidência</h3>
      <div className="space-y-4">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          disabled={loading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-brand-600 file:text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar com GPS"}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">✓ Foto enviada com sucesso!</p>}
      </div>
    </form>
  );
}
