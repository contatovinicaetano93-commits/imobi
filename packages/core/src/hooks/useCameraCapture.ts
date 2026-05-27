import { useState, useRef, useCallback } from "react";

export interface CameraCaptureState {
  status: "idle" | "requesting" | "ready" | "capturing" | "error";
  error: string | null;
  photoUri: string | null;
  photoBase64: string | null;
}

/**
 * Hook para captura de foto da câmera.
 * A implementação real (expo-camera) é injetada como callback.
 */
export function useCameraCapture(
  capturePhoto: () => Promise<{ uri: string; base64?: string }>
) {
  const [state, setState] = useState<CameraCaptureState>({
    status: "ready",
    error: null,
    photoUri: null,
    photoBase64: null,
  });

  const capture = useCallback(async () => {
    setState((s) => ({ ...s, status: "capturing", error: null }));
    try {
      const result = await capturePhoto();
      setState({
        status: "ready",
        error: null,
        photoUri: result.uri,
        photoBase64: result.base64 || null,
      });
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao capturar foto";
      setState({
        status: "error",
        error: message,
        photoUri: null,
        photoBase64: null,
      });
      throw err;
    }
  }, [capturePhoto]);

  const reset = useCallback(() => {
    setState({
      status: "ready",
      error: null,
      photoUri: null,
      photoBase64: null,
    });
  }, []);

  return { ...state, capture, reset };
}
