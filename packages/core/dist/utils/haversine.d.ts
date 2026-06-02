export interface Coordinates {
    latitude: number;
    longitude: number;
}
/**
 * Calcula distância em metros entre dois pontos geográficos (fórmula Haversine).
 */
export declare function calcularDistanciaMetros(a: Coordinates, b: Coordinates): number;
export declare function estaNoRaio(atual: Coordinates, alvo: Coordinates, raioMetros: number): boolean;
