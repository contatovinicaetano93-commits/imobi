import { Controller, Get, Post, UseGuards, Body, Query, Param } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/role.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stats")
  @ApiOperation({ summary: "Obter estatísticas gerais da plataforma" })
  @ApiResponse({
    status: 200,
    description: "Estatísticas agregadas",
    schema: {
      type: "object",
      properties: {
        usuarios: {
          type: "object",
          properties: {
            total: { type: "number" },
            porTipo: { type: "object" },
          },
        },
        obras: {
          type: "object",
          properties: {
            total: { type: "number" },
            porStatus: { type: "object" },
          },
        },
        creditos: {
          type: "object",
          properties: {
            total: { type: "number" },
            porStatus: { type: "object" },
          },
        },
      },
    },
  })
  async obterStats() {
    return this.adminService.obterStats();
  }

  @Get("kyc/pendentes")
  @ApiOperation({ summary: "Listar documentos KYC pendentes de análise" })
  @ApiQuery({ name: "skip", required: false, type: "number", description: "Offset para paginação" })
  @ApiQuery({ name: "take", required: false, type: "number", description: "Limite de resultados" })
  @ApiResponse({
    status: 200,
    description: "Lista de documentos KYC pendentes",
    schema: {
      type: "object",
      properties: {
        documentos: { type: "array" },
        total: { type: "number" },
        pagina: { type: "number" },
      },
    },
  })
  async listarKycPendentes(
    @Query("skip") skip?: string,
    @Query("take") take?: string
  ) {
    return this.adminService.listarKycPendentes(
      Number(skip) || 0,
      Number(take) || 20
    );
  }

  @Post("kyc/:usuarioId/aprovar")
  @ApiOperation({ summary: "Aprovar KYC de um usuário" })
  @ApiParam({ name: "usuarioId", type: "string", description: "ID do usuário" })
  @ApiResponse({ status: 200, description: "KYC aprovado com sucesso" })
  @ApiResponse({ status: 400, description: "Usuário não encontrado ou KYC já aprovado" })
  async aprovarKyc(
    @Param("usuarioId") usuarioId: string,
    @Body() body?: { motivo?: string }
  ) {
    await this.adminService.aprovarKyc(usuarioId, body?.motivo);
    return { mensagem: "KYC aprovado com sucesso" };
  }

  @Post("kyc/:usuarioId/rejeitar")
  @ApiOperation({ summary: "Rejeitar KYC de um usuário" })
  @ApiParam({ name: "usuarioId", type: "string", description: "ID do usuário" })
  @ApiResponse({ status: 200, description: "KYC rejeitado com sucesso" })
  @ApiResponse({ status: 400, description: "Motivo obrigatório ou erro na operação" })
  async rejeitarKyc(
    @Param("usuarioId") usuarioId: string,
    @Body() body: { motivo: string }
  ) {
    await this.adminService.rejeitarKyc(usuarioId, body.motivo);
    return { mensagem: "KYC rejeitado com sucesso" };
  }
}
