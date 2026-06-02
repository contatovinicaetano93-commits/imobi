import { useCallback, useState } from "react";
import type { Coordinates } from "../utils/haversine";

export interface GPSState {
  isLoading: boolean;
  error: string | null;
  coordinates: (Coordinates & { accuracy: number }) | null;
}

/**
 * Hook para captura de GPS agnóstico (mobile e web)
 *
 * No mobile (Expo), deve ser inicializado com:
 * initializeGPS(() => Location.requestForegroundPermissionsAsync(),
 *               () => Location.getCurrentPositionAsync(...))
 *
 * Uso:
 * const { getPosition, coordinates, error, isLoading } = useGPS();
 * await getPosition(); // captura coordenadas
 */

let permissionGetter: (() => Promise<{ status: string }>) | null = null;
let positionGetter: (() => Promise<Coordinates & { accuracy: number }>) | null =
  null;

/**
 * Inicializa o hook GPS com implementações específicas da plataforma
 * Chamado uma única vez no layout raiz do mobile
 */
export function initializeGPS(
  requestPermissions: () => Promise<{ status: string }>,
  getPosition: () => Promise<Coordinates & { accuracy: number }>,
) {
  permissionGetter = requestPermissions;
  positionGetter = getPosition;
}

export function useGPS() {
  const [state, setState] = useState<GPSState>({
    isLoading: false,
    error: null,
    coordinates: null,
  });

  const getPositionInternal = useCallback(async (): Promise<
    Coordinates & { accuracy: number }
  > => {
    setState({ isLoading: true, error: null, coordinates: null });

    try {
      // Se foi inicializado com positionGetter (mobile), usar direto
      if (positionGetter) {
        // Primeiro solicita permissão
        if (permissionGetter) {
          const { status } = await permissionGetter();
          if (status !== "granted") {
            throw new Error("permission_denied");
          }
        }

        const position = await positionGetter();
        setState({
          isLoading: false,
          error: null,
          coordinates: position,
        });
        return position;
      }

      // Fallback para navigator.geolocation (web)
      const nav = (globalThis as any).navigator;
      if (typeof nav !== "undefined" && nav.geolocation) {
        return new Promise<Coordinates & { accuracy: number }>((resolve, reject) => {
          nav.geolocation.getCurrentPosition(
            (pos: any) => {
              const coords = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy ?? 10,
              };
              setState({
                isLoading: false,
                error: null,
                coordinates: coords,
              });
              resolve(coords);
            },
            (err: any) => {
              const errorMsg = `Geolocation error: ${err.message}`;
              setState({
                isLoading: false,
                error: errorMsg,
                coordinates: null,
              });
              reject(new Error(errorMsg));
            },
            { enableHighAccuracy: true, timeout: 10000 },
          );
        });
      }

      throw new Error("GPS não disponível nesta plataforma");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Erro ao obter localização";
      setState({ isLoading: false, error: errorMsg, coordinates: null });
      throw err;
    }
  }, []);

  return {
    ...state,
    getPosition: getPositionInternal,
  };
}
