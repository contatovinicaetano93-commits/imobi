"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGeoValidation = useGeoValidation;
const react_1 = require("react");
const haversine_1 = require("../utils/haversine");
const MENSAGENS = {
    idle: "Aguardando verificação de localização.",
    checking: "Verificando sua localização...",
    inside_radius: "Localização confirmada. Você está na obra!",
    outside_radius: "Você está fora da área da obra.",
    poor_accuracy: "Sinal GPS fraco. Aguarde um momento e tente novamente.",
    permission_denied: "Permissão de localização negada.",
    unavailable: "GPS indisponível neste dispositivo.",
};
const MAX_ACCURACY_METERS = 15;
/**
 * Hook compartilhado — a implementação de getCurrentPosition é injetada
 * para que o mesmo hook funcione no web (navigator.geolocation) e no
 * mobile (expo-location), sem acoplar dependências nativas aqui.
 */
function useGeoValidation(alvo, raioMetros, getPosition) {
    const [state, setState] = (0, react_1.useState)({
        status: "idle",
        distanciaMetros: null,
        accuracyMetros: null,
        coordenadasAtuais: null,
        mensagem: MENSAGENS.idle,
    });
    const validar = (0, react_1.useCallback)(async () => {
        setState((s) => ({ ...s, status: "checking", mensagem: MENSAGENS.checking }));
        try {
            const pos = await getPosition();
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
            const distancia = (0, haversine_1.calcularDistanciaMetros)(pos, alvo);
            const dentro = (0, haversine_1.estaNoRaio)(pos, alvo, raioMetros);
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
        }
        catch (err) {
            const status = err instanceof Error && err.message.includes("denied")
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
