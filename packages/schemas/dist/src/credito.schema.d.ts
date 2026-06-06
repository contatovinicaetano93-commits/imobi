import { z } from "zod";
export declare const StatusCreditoEnum: any;
export declare const SimulacaoCreditoSchema: any;
export declare const SolicitacaoCreditoSchema: any;
export declare const LiberacaoParcelaSchema: any;
export type StatusCredito = z.infer<typeof StatusCreditoEnum>;
export type SimulacaoCreditoInput = z.infer<typeof SimulacaoCreditoSchema>;
export type SolicitacaoCreditoInput = z.infer<typeof SolicitacaoCreditoSchema>;
export type LiberacaoParcelaInput = z.infer<typeof LiberacaoParcelaSchema>;
