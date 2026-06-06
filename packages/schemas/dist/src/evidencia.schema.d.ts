import { z } from "zod";
export declare const UploadEvidenciaSchema: any;
export declare const ValidarEvidenciaSchema: any;
export declare const FiltroEvidenciaSchema: any;
export type UploadEvidenciaInput = z.infer<typeof UploadEvidenciaSchema>;
export type ValidarEvidenciaInput = z.infer<typeof ValidarEvidenciaSchema>;
export type FiltroEvidenciaInput = z.infer<typeof FiltroEvidenciaSchema>;
