"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ObraResumo } from "@/lib/api";

type ObrasMapProps = {
  obras: ObraResumo[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

const DEFAULT_CENTER: L.LatLngExpression = [-23.5505, -46.6333];

function hasCoords(obra: ObraResumo): boolean {
  return (
    typeof obra.geoLatitude === "number" &&
    typeof obra.geoLongitude === "number" &&
    !Number.isNaN(obra.geoLatitude) &&
    !Number.isNaN(obra.geoLongitude)
  );
}

export function ObrasMap({ obras, selectedId, onSelect }: ObrasMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const mappable = obras.filter(hasCoords);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (mappable.length === 0) return;

    const bounds = L.latLngBounds([]);

    mappable.forEach((obra) => {
      const lat = obra.geoLatitude;
      const lng = obra.geoLongitude;
      const isSelected = obra.id === selectedId;

      const icon = L.divIcon({
        html: `<div style="
          width: ${isSelected ? 28 : 22}px;
          height: ${isSelected ? 28 : 22}px;
          background-color: ${isSelected ? "#1B4FD8" : "#ff9800"};
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        className: "",
        iconSize: [isSelected ? 28 : 22, isSelected ? 28 : 22],
        iconAnchor: [isSelected ? 14 : 11, isSelected ? 14 : 11],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div class="text-sm"><strong>${obra.nome}</strong><br/>${obra.endereco ?? ""}</div>`
        );

      if (onSelect) {
        marker.on("click", () => onSelect(obra.id));
      }

      markersRef.current.push(marker);
      bounds.extend([lat, lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mappable, selectedId, onSelect]);

  if (mappable.length === 0) {
    return (
      <div className="h-80 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center text-sm text-gray-400">
        Nenhuma obra com coordenadas GPS nos resultados filtrados.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-80 sm:h-96 w-full rounded-2xl border border-gray-100 overflow-hidden z-0"
      aria-label="Mapa das obras"
    />
  );
}
