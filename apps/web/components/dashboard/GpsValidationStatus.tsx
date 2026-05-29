"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { GpsValidationMap } from "./GpsValidationMap";

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
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (pontos.length === 0) return null;

  // Calculate bounds with padding
  const lats = [obraLatitude, ...pontos.map((p) => p.latitude)];
  const lngs = [obraLongitude, ...pontos.map((p) => p.longitude)];

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Add padding (10% of range, minimum 0.01 for edge cases)
  let latRange = maxLat - minLat;
  let lngRange = maxLng - minLng;

  // Handle edge case: all points at same location (use minimum padding)
  if (latRange === 0) latRange = 0.01;
  if (lngRange === 0) lngRange = 0.01;

  const latPad = latRange * 0.1;
  const lngPad = lngRange * 0.1;

  const viewMinLat = minLat - latPad;
  const viewMaxLat = maxLat + latPad;
  const viewMinLng = minLng - lngPad;
  const viewMaxLng = maxLng + lngPad;

  const mapWidth = 500;
  const mapHeight = 350;

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
      <p className="text-xs font-semibold text-gray-700 mb-3">Mapa de Validação GPS (raio: {raioValidacaoMetros}m)</p>
      <div className="relative inline-block w-full">
        <svg width="100%" height={mapHeight} viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="border border-gray-300 rounded bg-white w-full" style={{ minHeight: `${mapHeight}px` }}>
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

          {/* Validation radius circle */}
          <circle cx={obraX} cy={obraY} r={radiusPixels} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,4" />

          {/* GPS Points */}
          {pontos.map((p, idx) => {
            const x = lngToX(p.longitude);
            const y = latToY(p.latitude);
            const isValid = (p.distanciaObra ?? 0) <= raioValidacaoMetros;
            const isHovered = hoveredPoint === idx;

            return (
              <g key={idx} onMouseEnter={() => setHoveredPoint(idx)} onMouseLeave={() => setHoveredPoint(null)}>
                {/* Accuracy circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={Math.max(2, (p.accuracy / metersPerDegree) * (mapWidth / (viewMaxLng - viewMinLng)))}
                  fill={isHovered ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.05)"}
                  opacity="0.6"
                />
                {/* Validation line if needed */}
                {!isValid && (
                  <line
                    x1={obraX}
                    y1={obraY}
                    x2={x}
                    y2={y}
                    stroke="#fca5a5"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity="0.5"
                  />
                )}
                {/* Point marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? "6" : "4"}
                  fill={isValid ? "#10b981" : "#ef4444"}
                  stroke="white"
                  strokeWidth={isHovered ? "2.5" : "1.5"}
                  style={{ transition: "r 0.2s, stroke-width 0.2s" }}
                  className="cursor-pointer"
                />
                {/* Label */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dy="0.3em"
                  fontSize={isHovered ? "11" : "10"}
                  fill="white"
                  fontWeight="bold"
                  style={{ transition: "font-size 0.2s", pointerEvents: "none" }}
                >
                  {idx + 1}
                </text>
              </g>
            );
          })}

          {/* Obra center */}
          <circle cx={obraX} cy={obraY} r="7" fill="#f59e0b" stroke="white" strokeWidth="2.5" />
          <text x={obraX} y={obraY} textAnchor="middle" dy="0.3em" fontSize="12" fontWeight="bold" fill="white" style={{ pointerEvents: "none" }}>
            O
          </text>
        </svg>
      </div>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-gray-700">Centro obra</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700">Validado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700">Inválido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-blue-500" style={{ background: "linear-gradient(90deg, transparent, #3b82f6, transparent)" }}></div>
            <span className="text-gray-700">Raio ativo</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 italic">Hover sobre os pontos para ver detalhes de acurácia e confiança</p>
      </div>

      {hoveredPoint !== null && (
        <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 text-sm">
          <div className="flex items-start justify-between mb-3">
            <p className="font-semibold text-gray-900">Ponto #{hoveredPoint + 1}</p>
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-600">Latitude:</span>
              <p className="font-mono font-semibold text-gray-900">{pontos[hoveredPoint].latitude.toFixed(6)}</p>
            </div>
            <div>
              <span className="text-gray-600">Longitude:</span>
              <p className="font-mono font-semibold text-gray-900">{pontos[hoveredPoint].longitude.toFixed(6)}</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-blue-200">
              <span className="text-gray-600">Acurácia (raio confiança):</span>
              <p className="font-semibold text-indigo-700">{pontos[hoveredPoint].accuracy.toFixed(1)}m</p>
              <p className="text-xs text-gray-500 mt-1">Margem de erro do equipamento GPS do dispositivo</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Distância até obra:</span>
              <p className={`font-semibold text-lg ${
                (pontos[hoveredPoint].distanciaObra ?? 0) <= 50 ? "text-green-600" : "text-red-600"
              }`}>
                {Math.round(pontos[hoveredPoint].distanciaObra ?? 0)}m
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center gap-2">
              {(pontos[hoveredPoint].distanciaObra ?? 0) <= 50 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 font-medium">Dentro da zona válida</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700 font-medium">Fora da zona de validação</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GpsValidationStatus({
  pontos,
  obraLatitude,
  obraLongitude,
  raioValidacaoMetros,
}: GpsValidationStatusProps) {
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'svg' | 'map'>('svg');

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
        {/* Visual map with toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Visualização GPS</p>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode('svg')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === 'svg'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Padrão (SVG)
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mapa Interativo
              </button>
            </div>
          </div>

          {viewMode === 'svg' ? (
            <GpsVisualization
              pontos={pontos}
              obraLatitude={obraLatitude}
              obraLongitude={obraLongitude}
              raioValidacaoMetros={raioValidacaoMetros}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <GpsValidationMap
                pontos={pontos}
                obraLatitude={obraLatitude}
                obraLongitude={obraLongitude}
                raioValidacaoMetros={raioValidacaoMetros}
              />
            </div>
          )}
        </div>

        {/* Detailed list toggle */}
        <button
          onClick={() => setExpandedDetails(!expandedDetails)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
        >
          <span className="font-semibold text-gray-700 text-sm">Detalhes dos {pontos.length} ponto{pontos.length !== 1 ? "s" : ""} GPS</span>
          {expandedDetails ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {/* Detailed list */}
        {expandedDetails && (
          <div className="space-y-2 text-sm">
            {pontos.map((p, idx) => {
              const isValid = (p.distanciaObra ?? 0) <= raioValidacaoMetros;
              const distancia = Math.round(p.distanciaObra ?? 0);
              const margemErro = raioValidacaoMetros - distancia;
              const confidenceScore = Math.max(0, Math.min(100, 100 - (p.accuracy / 10)));

              return (
                <div
                  key={idx}
                  className={`p-4 bg-white rounded-lg border ${
                    isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center text-white ${
                          isValid ? "bg-green-600" : "bg-red-600"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-gray-900 font-semibold">Ponto {idx + 1}</p>
                        <p className="text-xs text-gray-600 font-mono">
                          {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        isValid
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {isValid ? "✓ Válido" : "✕ Inválido"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                    <div className="bg-white bg-opacity-60 p-2 rounded">
                      <span className="text-gray-600 block">Distância</span>
                      <p className="font-bold text-gray-900 text-sm">{distancia}m</p>
                    </div>
                    <div className="bg-white bg-opacity-60 p-2 rounded">
                      <span className="text-gray-600 block">Acurácia GPS</span>
                      <p className="font-bold text-gray-900 text-sm">{p.accuracy.toFixed(1)}m</p>
                    </div>
                    <div className="bg-white bg-opacity-60 p-2 rounded">
                      <span className="text-gray-600 block">{isValid ? "Margem" : "Excesso"}</span>
                      <p className={`font-bold text-sm ${isValid ? "text-green-700" : "text-red-700"}`}>
                        {Math.abs(margemErro)}m
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-60 p-2 rounded">
                      <span className="text-gray-600 block">Confiança</span>
                      <p className="font-bold text-gray-900 text-sm">{Math.round(confidenceScore)}%</p>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Nível de confiança</span>
                      <span className="text-gray-700 font-semibold">{Math.round(confidenceScore)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          confidenceScore >= 80
                            ? "bg-green-500"
                            : confidenceScore >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${confidenceScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded border border-blue-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-blue-600 font-semibold mb-1">Centro da obra</p>
              <p className="font-mono text-gray-900 text-sm">
                {obraLatitude.toFixed(6)}
              </p>
              <p className="font-mono text-gray-900 text-sm">
                {obraLongitude.toFixed(6)}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-semibold mb-1">Raio de validação</p>
              <p className="text-2xl font-bold text-blue-700">{raioValidacaoMetros}m</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
