import { Controller, Get, Patch, Param, Query, UseGuards } from "@nestjs/common";
import { ParceirosService } from "./parceiros.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("parceiros")
export class ParceirosController {
  constructor(private readonly parceiros: ParceirosService) {}

  @Get()
  listar(
    @Query("kycStatus") kycStatus?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.parceiros.listar({
      kycStatus,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get("estatisticas")
  estatisticas() {
    return this.parceiros.estatisticas();
  }

  @Get(":id")
  buscar(@Param("id") id: string) {
    return this.parceiros.buscar(id);
  }

  @Patch(":id/aprovar")
  aprovar(@Param("id") id: string) {
    return this.parceiros.aprovar(id);
  }

  @Patch(":id/suspender")
  suspender(@Param("id") id: string) {
    return this.parceiros.suspender(id);
  }
}
