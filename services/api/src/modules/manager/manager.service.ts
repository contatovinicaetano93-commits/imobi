import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";

const CACHE_TTL_MS = 60_000;

@Injectable()
export class ManagerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /** Dashboard read-only do Fundo — capital e saúde da carteira. */
  async dashboard() {
    const cached = await this.cache.get("manager:dashboard");
    if (cached) return cached;

    const [obrasPorEtapa, tranches, capitalTotal] = await Promise.all([
      this.prisma.obra.groupBy({ by: ["etapa"], _count: true }),
      this.prisma.tranche.groupBy({ by: ["status"], _count: true, _sum: { valor: true } }),
      this.prisma.obra.aggregate({ _sum: { valorCredito: true } }),
    ]);

    const dre = {
      capitalContratado: capitalTotal._sum.valorCredito ?? 0,
      capitalLiberado:
        tranches.find((t) => t.status === "LIBERADA_ADMIN")?._sum.valor ?? 0,
      capitalPendente:
        tranches.find((t) => t.status === "VALIDADA_ENGENHEIRO")?._sum.valor ?? 0,
    };

    const resultado = {
      obrasPorEtapa: Object.fromEntries(obrasPorEtapa.map((o) => [o.etapa, o._count])),
      tranchesPorStatus: Object.fromEntries(tranches.map((t) => [t.status, t._count])),
      dre,
    };

    await this.cache.set("manager:dashboard", resultado, CACHE_TTL_MS);
    return resultado;
  }
}
