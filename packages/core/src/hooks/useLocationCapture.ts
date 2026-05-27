import { useState, useCallback } from "react";
import type { Coordinates } from "../utils/haversine";

export interface LocationCaptureState {
  status: "idle" | "requesting" | "success" | "error";
  error: string | null;
  location: (Coordinates & { accuracy: number }) | null;
}

/**
 * Hook para captura de localização GPS.
 * A implementação real (expo-location) é injetada como callback.
 */
export function useLocationCapture(
  getLocation: () => Promise<Coordinates & { accuracy: number }>
) {
  const [state, setState] = useState<LocationCaptureState>({
    status: "idle",
    error: null,
    location: null,
  });

  const capture = useCallback(async () => {
    setState({ status: "requesting", error: null, location: null });
    try {
      const location = await getLocation();
      setState({
        status: "success",
        error: null,
        location,
      });
      return location;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao capturar localização";
      setState({
        status: "error",
        error: message,
        location: null,
      });
      throw err;
    }
  }, [getLocation]);

  return { ...state, capture };
}
