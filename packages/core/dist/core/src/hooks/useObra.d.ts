import type { CriarObraInput } from "@imbobi/schemas";
export interface EtapaResumo {
    etapaId: string;
    nome: string;
    status: string;
    ordem: number;
}
export interface Obra {
    obraId: string;
    nome: string;
    status: string;
    areaM2: number;
    geoLatitude: number;
    geoLongitude: number;
    raioValidacaoMetros: number;
    endereco: unknown;
    etapas: EtapaResumo[];
    criadoEm: string;
}
export declare function useObra(token?: string): {
    listar: () => Promise<Obra[] | null>;
    buscar: (obraId: string) => Promise<Obra | null>;
    criar: (input: CriarObraInput) => Promise<Obra | null>;
    buscarProgresso: (obraId: string) => Promise<number | null>;
    obras: Obra[];
    obraAtual: Obra | null;
    progresso: number | null;
    loading: boolean;
    error: Error | null;
};
