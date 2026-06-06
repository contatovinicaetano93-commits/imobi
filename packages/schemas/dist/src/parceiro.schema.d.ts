import { z } from "zod";
export declare const TipoParceiroEnum: any;
export declare const CadastroParceiroSchema: any;
export declare const UpdateParceiroSchema: any;
export declare const FiltroParceiroSchema: any;
export type TipoParceiro = z.infer<typeof TipoParceiroEnum>;
export type CadastroParceiroInput = z.infer<typeof CadastroParceiroSchema>;
export type UpdateParceiroInput = z.infer<typeof UpdateParceiroSchema>;
export type FiltroParceiroInput = z.infer<typeof FiltroParceiroSchema>;
