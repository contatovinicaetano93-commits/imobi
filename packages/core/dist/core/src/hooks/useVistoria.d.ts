import type { AprovarVistoriaInput, RejeitarVistoriaInput } from "@imbobi/schemas";
export interface EtapaVistoria {
    etapaId: string;
    obraId: string;
    nome: string;
    status: string;
    percentualObra: number;
    ordem: number;
    dataConclusaoReal?: string;
}
export declare function useVistoria(token?: string): {
    aprovar: (etapaId: string, input: AprovarVistoriaInput) => Promise<{
        ok: boolean;
    } | null>;
    rejeitar: (etapaId: string, input: RejeitarVistoriaInput) => Promise<{
        ok: boolean;
    } | null>;
    listarPorObra: (obraId: string) => Promise<EtapaVistoria[] | null>;
    loading: boolean;
    error: Error | null;
};
