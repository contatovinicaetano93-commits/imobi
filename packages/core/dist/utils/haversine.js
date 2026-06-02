"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularDistanciaMetros = calcularDistanciaMetros;
exports.estaNoRaio = estaNoRaio;
const EARTH_RADIUS_METERS = 6371000;
/**
 * Calcula distância em metros entre dois pontos geográficos (fórmula Haversine).
 */
function calcularDistanciaMetros(a, b) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat +
        Math.cos(toRad(a.latitude)) *
            Math.cos(toRad(b.latitude)) *
            sinDLng *
            sinDLng;
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
function estaNoRaio(atual, alvo, raioMetros) {
    return calcularDistanciaMetros(atual, alvo) <= raioMetros;
}
