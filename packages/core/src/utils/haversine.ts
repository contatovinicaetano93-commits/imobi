const EARTH_RADIUS_METERS = 6_371_000;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calcula distância em metros entre dois pontos geográficos (fórmula Haversine).
 */
export function calcularDistanciaMetros(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      sinDLng *
      sinDLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function estaNoRaio(
  atual: Coordinates,
  alvo: Coordinates,
  raioMetros: number
): boolean {
  return calcularDistanciaMetros(atual, alvo) <= raioMetros;
}
