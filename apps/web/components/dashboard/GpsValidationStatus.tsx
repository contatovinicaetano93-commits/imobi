"use client";

export type GpsPoint = {
  latitude: number;
  longitude: number;
  accuracy: number;
  distanciaObra?: number;
};

export type GpsValidationStatusProps = {
  pontos: GpsPoint[];
  obraLatitude: number;
  obraLongitude: number;
  raioValidacaoMetros: number;
};

export function GpsValidationStatus({
  pontos,
  obraLatitude,
  obraLongitude,
  raioValidacaoMetros,
}: GpsValidationStatusProps) {
  if (pontos.length === 0) {
    return (
      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
        <p className="text-sm text-yellow-800">
          Nenhum dado GPS disponível para validação
        </p>
      </div>
    );
  }

  // Calcular estatísticas
  const validoPontos = pontos.filter(
    (p) => (p.distanciaObra ?? 0) <= raioValidacaoMetros
  );
  const validoPercentual = Math.round((validoPontos.length / pontos.length) * 100);
  const temAlerta = validoPercentual < 100;
  const temErro = validoPercentual < 50;

  let statusColor = "bg-green-50 border-green-200";
  let statusBg = "bg-green-100 text-green-800";
  let icon = "✓";
  let label = "Validado";

  if (temErro) {
    statusColor = "bg-red-50 border-red-200";
    statusBg = "bg-red-100 text-red-800";
    icon = "✕";
    label = "Inválido";
  } else if (temAlerta) {
    statusColor = "bg-yellow-50 border-yellow-200";
    statusBg = "bg-yellow-100 text-yellow-800";
    icon = "⚠";
    label = "Parcial";
  }

  return (
    <div className={`rounded-lg border p-4 ${statusColor}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">GPS Validation</h3>
          <p className="text-sm text-gray-600">
            {validoPontos.length} de {pontos.length} fotos validadas
            ({validoPercentual}%)
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusBg}`}>
          {icon} {label}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {pontos.map((p, idx) => {
          const isValid = (p.distanciaObra ?? 0) <= raioValidacaoMetros;
          const distancia = Math.round(p.distanciaObra ?? 0);

          return (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                    isValid
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="text-gray-700">
                  {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">
                  {distancia}m away (accuracy: {p.accuracy.toFixed(1)}m)
                </p>
                {!isValid && (
                  <p className="text-xs text-red-600 font-semibold">
                    Fora do raio
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-white rounded border border-gray-200 text-sm">
        <p className="text-gray-700">
          <span className="font-semibold">Obra localizada em:</span>{" "}
          {obraLatitude.toFixed(6)}, {obraLongitude.toFixed(6)}
        </p>
        <p className="text-gray-600 text-xs mt-1">
          Raio de validação: {raioValidacaoMetros}m
        </p>
      </div>
    </div>
  );
}
