"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaResponseSchema = void 0;
const zod_1 = require("zod");
const usuario_schema_1 = require("./usuario.schema");
const obra_schema_1 = require("./obra.schema");
/** Passo guiado — 1 fonte de verdade pro que cada papel vê/faz agora. */
exports.JornadaResponseSchema = zod_1.z.object({
    role: usuario_schema_1.RoleEnum,
    etapaAtual: obra_schema_1.EtapaFunilEnum.optional(),
    titulo: zod_1.z.string(),
    descricao: zod_1.z.string(),
    href: zod_1.z.string(),
    concluido: zod_1.z.boolean(),
    progressoPct: zod_1.z.number().min(0).max(100),
    bloqueado: zod_1.z.string().optional(),
});
