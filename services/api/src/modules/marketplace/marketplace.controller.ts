import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { MarketplaceService } from "./marketplace.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get("resumo")
  resumo() {
    return this.marketplace.resumo();
  }

  @Get("categorias")
  categorias() {
    return this.marketplace.listarCategorias();
  }

  @Get("parceiros")
  parceiros(@Query("categoria") categoria?: string) {
    return this.marketplace.listarParceirosAtivos(categoria);
  }
}
