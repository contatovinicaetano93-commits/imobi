import { z } from "zod";
export declare const AprovarVistoriaSchema: any;
export declare const RejeitarVistoriaSchema: any;
export declare const AgendarVistoriaSchema: any;
export declare const FiltroVistoriaSchema: any;
export type AprovarVistoriaInput = z.infer<typeof AprovarVistoriaSchema>;
export type RejeitarVistoriaInput = z.infer<typeof RejeitarVistoriaSchema>;
export type AgendarVistoriaInput = z.infer<typeof AgendarVistoriaSchema>;
export type FiltroVistoriaInput = z.infer<typeof FiltroVistoriaSchema>;
