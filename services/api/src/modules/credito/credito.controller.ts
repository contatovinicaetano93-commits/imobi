import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, ForbiddenException } from "@nestjs/common";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { CreditoService } from "./credito.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { SimulacaoCreditoSchema, SolicitacaoCreditoSchema } from "@imbobi/schemas";

@ApiTags("credito")
@Controller("credito")
export class CreditoController {
  constructor(private readonly credito: CreditoService) {}

  @Post("simular")
  @ApiOperation({ summary: "Simular crédito", description: "Simula condições de crédito sem criar solicitação (endpoint público)" })
  @ApiResponse({ status: 201, description: "Simulação calculada" })
  @ApiResponse({ status: 400, description: "Parâmetros inválidos" })
  simular(@Body(new ZodPipe(SimulacaoCreditoSchema)) body: unknown) {
    return this.credito.simular(body as never);
  }

  @UseGuards(JwtAuthGuard)
  @Post("solicitar")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Solicitar crédito", description: "Cria uma nova solicitação de crédito autenticado" })
  @ApiResponse({ status: 201, description: "Crédito solicitado com sucesso" })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  solicitar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(SolicitacaoCreditoSchema)) body: unknown
  ) {
    return this.credito.solicitar(u.id, body as never);
  }

  @UseGuards(JwtAuthGuard)
  @Get("meus")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Meus créditos", description: "Lista créditos do usuário autenticado" })
  @ApiResponse({ status: 200, description: "Lista de créditos" })
  meus(@UsuarioAtual() u: IUsuario) {
    return this.credito.buscarPorUsuario(u.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/extrato")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 min
  async extrato(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    const credito = await this.credito.buscarPorId(id);
    if (!credito || credito.usuarioId !== u.id) {
      throw new ForbiddenException("Acesso negado a este crédito.");
    }
    return this.credito.extrato(id);
  }
}
