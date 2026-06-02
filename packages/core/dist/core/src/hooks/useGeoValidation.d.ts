import { type Coordinates } from "../utils/haversine";
export type GeoStatus = "idle" | "checking" | "inside_radius" | "outside_radius" | "poor_accuracy" | "permission_denied" | "unavailable";
export interface GeoValidationState {
    status: GeoStatus;
    distanciaMetros: number | null;
    accuracyMetros: number | null;
    coordenadasAtuais: Coordinates | null;
    mensagem: string;
}
/**
 * Hook compartilhado — a implementação de getCurrentPosition é injetada
 * para que o mesmo hook funcione no web (navigator.geolocation) e no
 * mobile (expo-location), sem acoplar dependências nativas aqui.
 */
export declare function useGeoValidation(alvo: Coordinates, raioMetros: number, getPosition: () => Promise<Coordinates & {
    accuracy: number;
}>): {
    validar: () => Promise<boolean>;
    status: GeoStatus;
    distanciaMetros: number | null;
    accuracyMetros: number | null;
    coordenadasAtuais: Coordinates | null;
    mensagem: string;
};
