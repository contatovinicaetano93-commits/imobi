'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type GpsValidationMapProps = {
  pontos: Array<{
    latitude: number;
    longitude: number;
    accuracy: number;
    distanciaObra?: number;
  }>;
  obraLatitude: number;
  obraLongitude: number;
  raioValidacaoMetros: number;
};

export function GpsValidationMap({
  pontos,
  obraLatitude,
  obraLongitude,
  raioValidacaoMetros,
}: GpsValidationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Evita reinicializar o mapa se já existe
    if (mapRef.current) {
      return;
    }

    // Garante que o container existe
    if (!containerRef.current) {
      return;
    }

    // Inicializa o mapa
    const map = L.map(containerRef.current).setView(
      [obraLatitude, obraLongitude],
      15
    );

    // Adiciona tile layer do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Define ícone customizado para a obra
    const obraIcon = L.divIcon({
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background-color: #ff9800;
          border: 3px solid #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <div style="width: 6px; height: 6px; background-color: #fff; border-radius: 50%;"></div>
        </div>
      `,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });

    // Marcador da obra
    const obraMarker = L.marker([obraLatitude, obraLongitude], {
      icon: obraIcon,
    }).addTo(map);
    obraMarker.bindPopup(
      `<div class="text-sm"><strong>Obra</strong><br/>Lat: ${obraLatitude.toFixed(5)}<br/>Lng: ${obraLongitude.toFixed(5)}</div>`
    );

    // Círculo de raio de validação
    L.circle([obraLatitude, obraLongitude], {
      radius: raioValidacaoMetros,
      color: '#0066ff',
      weight: 2,
      opacity: 0.7,
      fill: false,
      dashArray: '5, 5',
    }).addTo(map);

    // Ícone para GPS válido
    const gpsValidoIcon = L.divIcon({
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background-color: #4caf50;
          border: 2px solid #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
          <div style="width: 4px; height: 4px; background-color: #fff; border-radius: 50%;"></div>
        </div>
      `,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });

    // Ícone para GPS inválido
    const gpsInvalidoIcon = L.divIcon({
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background-color: #f44336;
          border: 2px solid #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
          <div style="width: 4px; height: 4px; background-color: #fff; border-radius: 50%;"></div>
        </div>
      `,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });

    // Adiciona marcadores de GPS
    const bounds = L.latLngBounds([
      [obraLatitude, obraLongitude],
      [obraLatitude, obraLongitude],
    ]);

    pontos.forEach((ponto) => {
      const isValido =
        ponto.distanciaObra !== undefined &&
        ponto.distanciaObra <= raioValidacaoMetros;
      const icon = isValido ? gpsValidoIcon : gpsInvalidoIcon;

      const marker = L.marker([ponto.latitude, ponto.longitude], {
        icon,
      }).addTo(map);

      const popupContent = `
        <div class="text-sm">
          <strong>${isValido ? 'GPS Válido' : 'GPS Inválido'}</strong><br/>
          Lat: ${ponto.latitude.toFixed(5)}<br/>
          Lng: ${ponto.longitude.toFixed(5)}<br/>
          Precisão: ${ponto.accuracy.toFixed(1)}m<br/>
          ${ponto.distanciaObra !== undefined ? `Distância: ${ponto.distanciaObra.toFixed(1)}m` : ''}
        </div>
      `;
      marker.bindPopup(popupContent);

      bounds.extend([ponto.latitude, ponto.longitude]);
    });

    // Zoom automático para enquadrar todos os pontos
    if (pontos.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    mapRef.current = map;

    // Cleanup: remove map instance properly
    return () => {
      if (mapRef.current) {
        // Detach all layers before removing
        mapRef.current.eachLayer((layer) => {
          mapRef.current?.removeLayer(layer);
        });
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pontos, obraLatitude, obraLongitude, raioValidacaoMetros]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 'clamp(300px, 50vh, 500px)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}
    />
  );
}
