import { type Coordinates } from "../utils/haversine";
export type GeoStatus = "idle" | "checking" | "inside_radius" | "outside_radius" | "poor_accuracy" | "mock_detected" | "permission_denied" | "unavailable";
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
/**
 * Hook compartilhado — getPosition é injetado para funcionar
 * tanto no web (navigator.geolocation) quanto no mobile (expo-location).
 */
export declare function useGeoValidation(alvo: Coordinates, raioMetros: number, getPosition: () => Promise<GeoPosition>): {
    validar: () => Promise<boolean>;
    status: GeoStatus;
    distanciaMetros: number | null;
    accuracyMetros: number | null;
    coordenadasAtuais: GeoPosition | null;
    mensagem: string;
};
