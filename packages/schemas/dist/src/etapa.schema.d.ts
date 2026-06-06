import { z } from "zod";
export declare const AprovarEtapaSchema: any;
export declare const RejeitarEtapaSchema: any;
export declare const AtualizarStatusEtapaSchema: any;
export declare const FiltroEtapaSchema: any;
export type AprovarEtapaInput = z.infer<typeof AprovarEtapaSchema>;
export type RejeitarEtapaInput = z.infer<typeof RejeitarEtapaSchema>;
export type AtualizarStatusEtapaInput = z.infer<typeof AtualizarStatusEtapaSchema>;
export type FiltroEtapaInput = z.infer<typeof FiltroEtapaSchema>;
