"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Visita, ValidacaoForm, ObraResumo } from "@/lib/api";
import { engenheirosApi } from "@/lib/api";
import { useGeoValidation } from "@imbobi/core";
import { CheckCircle2, AlertCircle, Camera, Loader2, MapPin, CheckSquare } from "lucide-react";

const validacaoSchema = z.object({
  obraCondicoes: z.object({
    estruturaOk: z.boolean(),
    fundacaoOk: z.boolean(),
    coberturaPlanejada: z.boolean(),
    observacoes: z.string().optional(),
  }),
  conformidade: z.object({
    protetoresPresentes: z.boolean(),
    sinalizacaoOk: z.boolean(),
    acessoSeguro: z.boolean(),
    observacoes: z.string().optional(),
  }),
  observacoesGerais: z.string().optional(),
});

type ValidationInput = z.infer<typeof validacaoSchema>;

interface PhotoUpload {
  id: string;
  url: string;
  latCaptura: number;
  lngCaptura: number;
  accuracyMetros: number;
  descricao?: string;
}

export function ValidationFormClient({
  visitaId,
  visita,
  obra,
  initialValidacao,
}: {
  visitaId: string;
  visita: Visita;
  obra: ObraResumo | null;
  initialValidacao: ValidacaoForm | null;
}) {
  const [photos, setPhotos] = useState<PhotoUpload[]>(initialValidacao?.fotos ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [geoMessage, setGeoMessage] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ValidationInput>({
    resolver: zodResolver(validacaoSchema),
    defaultValues: initialValidacao
      ? {
          obraCondicoes: initialValidacao.obraCondicoes,
          conformidade: initialValidacao.conformidade,
          observacoesGerais: initialValidacao.observacoesGerais,
        }
      : undefined,
  });

  const getPosition = async () => {
    return new Promise<{ latitude: number; longitude: number; accuracy: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          if (err.code === 1) reject(new Error("Location permission denied"));
          else reject(new Error("Location unavailable"));
        }
      );
    });
  };

  const geoValidation = useGeoValidation(
    { latitude: visita.obra.geoLatitude, longitude: visita.obra.geoLongitude },
    visita.obra.raioValidacaoMetros,
    getPosition
  );

  const handleCapturePhoto = async () => {
    if (!obra) return;

    setPhotoLoading(true);
    setGeoStatus("checking");
    setGeoMessage("Capturando localização...");

    try {
      const isValid = await geoValidation.validar();

      if (!isValid) {
        setGeoStatus("error");
        setGeoMessage(geoValidation.mensagem);
        setPhotoLoading(false);
        return;
      }

      setGeoStatus("success");
      setGeoMessage("Localização validada! Abra a câmera para capturar a foto.");

      const input = document.getElementById(`camera-input-${visitaId}`) as HTMLInputElement;
      input?.click();
    } catch (err) {
      setGeoStatus("error");
      setGeoMessage(err instanceof Error ? err.message : "Erro ao validar localização");
      setPhotoLoading(false);
    }
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("latitude", String(geoValidation.coordenadasAtuais?.latitude ?? 0));
      formData.append("longitude", String(geoValidation.coordenadasAtuais?.longitude ?? 0));
      formData.append("accuracy", String(geoValidation.accuracyMetros ?? 0));

      const response = await engenheirosApi.fazerUploadFoto(visitaId, formData);

      setPhotos((prev) => [...prev, response]);
      setGeoStatus("idle");
      setGeoMessage("");
      
      const input = document.getElementById(`camera-input-${visitaId}`) as HTMLInputElement;
      if (input) input.value = "";
    } catch (err) {
      setSubmitMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao fazer upload da foto",
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const onSubmit = async (data: ValidationInput) => {
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      await engenheirosApi.submeterValidacao(visitaId, {
        ...data,
        fotos: photos,
        status: "ENVIADA",
      });

      setSubmitMessage({
        type: "success",
        text: "Validação enviada com sucesso!",
      });

      reset();
      setPhotos([]);
    } catch (err) {
      setSubmitMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao enviar validação",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Conditions Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">Condições da Obra</h2>

        <div className="space-y-4">
          {[
            { field: "estruturaOk" as const, label: "Estrutura em bom estado" },
            { field: "fundacaoOk" as const, label: "Fundação adequada" },
            { field: "coberturaPlanejada" as const, label: "Cobertura conforme planejado" },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                {...register(`obraCondicoes.${field}`)}
                className="w-5 h-5 rounded border-gray-300 text-brand-600 cursor-pointer"
              />
              <span className="text-sm sm:text-base text-gray-700 flex-1">{label}</span>
              <CheckSquare className="w-5 h-5 text-gray-300" />
            </label>
          ))}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações sobre condições</label>
            <textarea
              {...register("obraCondicoes.observacoes")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Descreva qualquer problema ou observação importante..."
            />
          </div>
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">Conformidade e Segurança</h2>

        <div className="space-y-4">
          {[
            { field: "protetoresPresentes" as const, label: "Protetores de queda presentes" },
            { field: "sinalizacaoOk" as const, label: "Sinalização adequada" },
            { field: "acessoSeguro" as const, label: "Acesso seguro ao local" },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                {...register(`conformidade.${field}`)}
                className="w-5 h-5 rounded border-gray-300 text-brand-600 cursor-pointer"
              />
              <span className="text-sm sm:text-base text-gray-700 flex-1">{label}</span>
              <CheckSquare className="w-5 h-5 text-gray-300" />
            </label>
          ))}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações sobre conformidade</label>
            <textarea
              {...register("conformidade.observacoes")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Descreva qualquer problema de conformidade..."
            />
          </div>
        </div>
      </div>

      {/* Photo Upload with GPS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">Fotos da Inspeção</h2>

        <div className="mb-6">
          <button
            type="button"
            onClick={handleCapturePhoto}
            disabled={photoLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-gray-400 font-semibold transition-colors text-sm sm:text-base"
          >
            {photoLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Validando localização...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Capturar Foto
              </>
            )}
          </button>

          <input
            id={`camera-input-${visitaId}`}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelected}
            className="hidden"
          />
        </div>

        {/* Geo Status */}
        {geoMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            geoStatus === "success" ? "bg-green-50 border border-green-200" :
            geoStatus === "error" ? "bg-red-50 border border-red-200" :
            "bg-blue-50 border border-blue-200"
          }`}>
            {geoStatus === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : geoStatus === "error" ? (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${
                geoStatus === "success" ? "text-green-900" :
                geoStatus === "error" ? "text-red-900" :
                "text-blue-900"
              }`}>
                {geoMessage}
              </p>
            </div>
          </div>
        )}

        {/* Photos Grid */}
        {photos.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Fotos Capturadas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <img
                    src={photo.url}
                    alt="Inspeção"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                    <p className="text-xs text-white font-semibold">
                      Precisão: {Math.round(photo.accuracyMetros)}m
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* General Observations */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <label className="block text-base sm:text-lg font-semibold text-gray-900 mb-4">
          Observações Gerais
        </label>
        <textarea
          {...register("observacoesGerais")}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="Adicione observações finais sobre a inspeção..."
        />
      </div>

      {/* Messages */}
      {submitMessage && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          submitMessage.type === "success"
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}>
          {submitMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm font-semibold ${
            submitMessage.type === "success" ? "text-green-900" : "text-red-900"
          }`}>
            {submitMessage.text}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <a
          href="/dashboard/engenheiro"
          className="px-6 py-3 text-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors text-sm sm:text-base"
        >
          Voltar
        </a>
        <button
          type="submit"
          disabled={isSubmitting || photos.length === 0}
          className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-gray-400 font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar Validação"
          )}
        </button>
      </div>
    </form>
  );
}
