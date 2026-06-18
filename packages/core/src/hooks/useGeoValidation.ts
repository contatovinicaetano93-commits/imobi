"use client";

import { useState, useCallback } from "react";
import { calcularDistanciaMetros, estaNoRaio, type Coordinates } from "../utils/haversine";

export type GeoStatus =
  | "idle"
  | "checking"
  | "inside_radius"
  | "outside_radius"
  | "poor_accuracy"
  | "mock_detected"
  | "permission_denied"
  | "unavailable";

export interface GeoPosition extends Coordinates {
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  isMockLocation?: boolean;
}

export interface GeoValidationState {
  status: GeoStatus;
  distanciaMetros: number | null;
  accuracyMetros: number | null;
  coordenadasAtuais: GeoPosition | null;
  mensagem: string;
}

const MENSAGENS: Record<GeoStatus, string> = {
  idle: "Aguardando verificação de localização.",
  checking: "Verificando sua localização...",
  inside_radius: "Localização confirmada. Você está na obra!",
  outside_radius: "Você está fora da área da obra.",
  poor_accuracy: "Sinal GPS fraco. Aguarde um momento e tente novamente.",
  mock_detected: "Localização simulada detectada. Desative apps de GPS falso e tente novamente.",
  permission_denied: "Permissão de localização negada.",
  unavailable: "GPS indisponível neste dispositivo.",
};

const MAX_ACCURACY_METERS = 15;
const MIN_ACCURACY_METERS = 1; // abaixo disso = GPS falso

function detectarMock(pos: GeoPosition): boolean {
  // Flag explícita do Android (Expo Location expõe `mocked`)
  if (pos.isMockLocation === true) return true;
  // Accuracy sub-1m impossível em GPS real
  if (pos.accuracy > 0 && pos.accuracy < MIN_ACCURACY_METERS) return true;
  return false;
}

/**
 * Hook compartilhado — getPosition é injetado para funcionar
 * tanto no web (navigator.geolocation) quanto no mobile (expo-location).
 */
export function useGeoValidation(
  alvo: Coordinates,
  raioMetros: number,
  getPosition: () => Promise<GeoPosition>,
) {
  const [state, setState] = useState<GeoValidationState>({
    status: "idle",
    distanciaMetros: null,
    accuracyMetros: null,
    coordenadasAtuais: null,
    mensagem: MENSAGENS.idle,
  });

  const validar = useCallback(async () => {
    setState((s) => ({ ...s, status: "checking", mensagem: MENSAGENS.checking }));

    try {
      const pos = await getPosition();

      if (detectarMock(pos)) {
        setState({
          status: "mock_detected",
          distanciaMetros: null,
          accuracyMetros: pos.accuracy,
          coordenadasAtuais: pos,
          mensagem: MENSAGENS.mock_detected,
        });
        return false;
      }

      if (pos.accuracy > MAX_ACCURACY_METERS) {
        setState({
          status: "poor_accuracy",
          distanciaMetros: null,
          accuracyMetros: pos.accuracy,
          coordenadasAtuais: pos,
          mensagem: MENSAGENS.poor_accuracy,
        });
        return false;
      }

      const distancia = calcularDistanciaMetros(pos, alvo);
      const dentro = estaNoRaio(pos, alvo, raioMetros);

      setState({
        status: dentro ? "inside_radius" : "outside_radius",
        distanciaMetros: distancia,
        accuracyMetros: pos.accuracy,
        coordenadasAtuais: pos,
        mensagem: dentro
          ? MENSAGENS.inside_radius
          : `${MENSAGENS.outside_radius} Distância: ${Math.round(distancia)}m`,
      });

      return dentro;
    } catch (err) {
      const status =
        err instanceof Error && err.message.includes("denied")
          ? "permission_denied"
          : "unavailable";
      setState({
        status,
        distanciaMetros: null,
        accuracyMetros: null,
        coordenadasAtuais: null,
        mensagem: MENSAGENS[status],
      });
      return false;
    }
  }, [alvo, raioMetros, getPosition]);

  return { ...state, validar };
}
