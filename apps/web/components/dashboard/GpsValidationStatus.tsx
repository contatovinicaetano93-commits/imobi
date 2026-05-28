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

function GpsVisualization({
  pontos,
  obraLatitude,
  obraLongitude,
  raioValidacaoMetros,
}: GpsValidationStatusProps) {
  if (pontos.length === 0) return null;

  // Calculate bounds with padding
  const lats = [obraLatitude, ...pontos.map((p) => p.latitude)];
  const lngs = [obraLongitude, ...pontos.map((p) => p.longitude)];

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Add padding (10% of range)
  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;
  const latPad = latRange * 0.1;
  const lngPad = lngRange * 0.1;

  const viewMinLat = minLat - latPad;
  const viewMaxLat = maxLat + latPad;
  const viewMinLng = minLng - lngPad;
  const viewMaxLng = maxLng + lngPad;

  const mapWidth = 400;
  const mapHeight = 300;

  const latToY = (lat: number) => {
    const ratio = (viewMaxLat - lat) / (viewMaxLat - viewMinLat);
    return ratio * mapHeight;
  };

  const lngToX = (lng: number) => {
    const ratio = (lng - viewMinLng) / (viewMaxLng - viewMinLng);
    return ratio * mapWidth;
  };

  const obraX = lngToX(obraLongitude);
  const obraY = latToY(obraLatitude);

  // Convert meters to pixels (rough approximation at equator ~111km per degree)
  const metersPerDegree = 111000;
  const radiusPixels = (raioValidacaoMetros / metersPerDegree) * (mapWidth / (viewMaxLng - viewMinLng));

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <p className="text-xs font-semibold text-gray-700 mb-3">Mapa de Validação GPS</p>
      <svg width={mapWidth} height={mapHeight} className="border border-gray-300 rounded bg-white">
        {/* Validation radius circle */}
        <circle cx={obraX} cy={obraY} r={radiusPixels} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" />

        {/* GPS Points */}
        {pontos.map((p, idx) => {
          const x = lngToX(p.longitude);
          const y = latToY(p.latitude);
          const isValid = (p.distanciaObra ?? 0) <= raioValidacaoMetros;

          return (
            <g key={idx}>
              {/* Accuracy circle */}
              <circle cx={x} cy={y} r={Math.max(2, (p.accuracy / metersPerDegree) * (mapWidth / (viewMaxLng - viewMinLng)))} fill="rgba(0,0,0,0.05)" />
              {/* Point marker */}
              <circle cx={x} cy={y} r="4" fill={isValid ? "#10b981" : "#ef4444"} stroke="white" strokeWidth="1.5" />
              {/* Label */}
              <text x={x} y={y} textAnchor="middle" dy="0.3em" fontSize="10" fill="white" fontWeight="bold">
                {idx + 1}
              </text>
            </g>
          );
        })}

        {/* Obra center */}
        <circle cx={obraX} cy={obraY} r="6" fill="#f59e0b" stroke="white" strokeWidth="2" />
        <text x={obraX} y={obraY} textAnchor="middle" dy="0.3em" fontSize="11" fontWeight="bold" fill="white">
          O
        </text>
      </svg>

      <div className="mt-3 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-gray-700">Obra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-700">Válido</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-700">Inválido</span>
        </div>
      </div>
    </div>
  );
}

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
          <h3 className="font-semibold text-gray-900 mb-1">Validação GPS</h3>
          <p className="text-sm text-gray-600">
            {validoPontos.length} de {pontos.length} fotos validadas
            ({validoPercentual}%)
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusBg}`}>
          {icon} {label}
        </span>
      </div>

      <div className="space-y-4">
        {/* Visual map */}
        <GpsVisualization
          pontos={pontos}
          obraLatitude={obraLatitude}
          obraLongitude={obraLongitude}
          raioValidacaoMetros={raioValidacaoMetros}
        />

        {/* Detailed list */}
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

        <div className="p-3 bg-white rounded border border-gray-200 text-sm">
          <p className="text-gray-700">
            <span className="font-semibold">Obra localizada em:</span>{" "}
            {obraLatitude.toFixed(6)}, {obraLongitude.toFixed(6)}
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Raio de validação: {raioValidacaoMetros}m
          </p>
        </div>
      </div>
    </div>
  );
}
