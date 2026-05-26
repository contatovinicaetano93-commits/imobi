import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { MarketplaceService } from "./marketplace.service";
import { VistoriaStatus } from "@prisma/client";

@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // ─── Contractor Endpoints ───────────────────────────────────────

  @Post("parceiros")
  @UseGuards(AuthGuard("jwt"))
  async criarParceiro(
    @Request() req,
    @Body() body: {
      descricao?: string;
      especialidades: string[];
      telefone?: string;
      endereco?: string;
    },
  ) {
    return this.marketplaceService.criarParceiro(req.user.userId, body);
  }

  @Get("parceiros/search")
  async listarParceiros(
    @Query("especialidade") especialidade?: string,
    @Query("minAvaliacao") minAvaliacao?: string,
    @Query("limite") limite?: string,
    @Query("offset") offset?: string,
  ) {
    return this.marketplaceService.listarParceiros({
      especialidade,
      minAvaliacao: minAvaliacao ? parseInt(minAvaliacao) : 0,
      limite: limite ? parseInt(limite) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get("parceiros/:parceiroId")
  async obterParceiro(@Param("parceiroId") parceiroId: string) {
    return this.marketplaceService.obterParceiro(parceiroId);
  }

  @Patch("parceiros/:parceiroId")
  @UseGuards(AuthGuard("jwt"))
  async atualizarParceiro(
    @Param("parceiroId") parceiroId: string,
    @Request() req,
    @Body() body: Partial<{
      descricao: string;
      especialidades: string[];
      telefone: string;
      endereco: string;
      ativo: boolean;
    }>,
  ) {
    return this.marketplaceService.atualizarParceiro(
      parceiroId,
      req.user.userId,
      body,
    );
  }

  // ─── Service Endpoints ───────────────────────────────────────

  @Post("servicos")
  @UseGuards(AuthGuard("jwt"))
  async criarServico(
    @Request() req,
    @Body() body: {
      parceiroId: string;
      nome: string;
      descricao?: string;
      preco: number;
      estimadoHoras?: number;
    },
  ) {
    return this.marketplaceService.criarServico(
      body.parceiroId,
      req.user.userId,
      body,
    );
  }

  @Get("servicos/:parceiroId")
  async listarServicos(@Param("parceiroId") parceiroId: string) {
    return this.marketplaceService.listarServicos(parceiroId);
  }

  // ─── Inspection/Booking Endpoints ───────────────────────────────

  @Post("vistorias")
  @UseGuards(AuthGuard("jwt"))
  async agendarVistoria(
    @Body() body: {
      etapaId: string;
      parceiroId: string;
      servicoId?: string;
      precoAcordado?: number;
      dataAgendada?: Date;
    },
  ) {
    return this.marketplaceService.agendarVistoria(body);
  }

  @Get("vistorias/:vistoriaId")
  async obterVistoria(@Param("vistoriaId") vistoriaId: string) {
    return this.marketplaceService.obterVistoria(vistoriaId);
  }

  @Patch("vistorias/:vistoriaId")
  @UseGuards(AuthGuard("jwt"))
  async atualizarStatusVistoria(
    @Param("vistoriaId") vistoriaId: string,
    @Request() req,
    @Body() body: { status: VistoriaStatus; observacao?: string },
  ) {
    return this.marketplaceService.atualizarStatusVistoria(
      vistoriaId,
      req.user.parceiroId,
      body.status,
      body.observacao,
    );
  }

  @Get("vistorias/parceiro/:parceiroId")
  async listarVistoriasParceiro(
    @Param("parceiroId") parceiroId: string,
    @Query("status") status?: VistoriaStatus,
    @Query("limite") limite?: string,
    @Query("offset") offset?: string,
  ) {
    return this.marketplaceService.listarVistoriasParceiro(parceiroId, {
      status,
      limite: limite ? parseInt(limite) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get("etapa/:etapaId/vistorias")
  async listarVistoriasEtapa(@Param("etapaId") etapaId: string) {
    return this.marketplaceService.listarVistoriasEtapa(etapaId);
  }

  // ─── Review Endpoints ───────────────────────────────────────

  @Post("parceiros/:parceiroId/avaliacoes")
  @UseGuards(AuthGuard("jwt"))
  async avaliarParceiro(
    @Param("parceiroId") parceiroId: string,
    @Request() req,
    @Body() body: {
      vistoriaId?: string;
      estrelas: number;
      comentario?: string;
    },
  ) {
    return this.marketplaceService.avaliarParceiro({
      parceiroId,
      usuarioId: req.user.userId,
      vistoriaId: body.vistoriaId,
      estrelas: body.estrelas,
      comentario: body.comentario,
    });
  }

  @Get("parceiros/:parceiroId/avaliacoes")
  async listarAvaliacoesParceiro(
    @Param("parceiroId") parceiroId: string,
    @Query("limite") limite?: string,
  ) {
    return this.marketplaceService.listarAvaliacoesParceiro(
      parceiroId,
      limite ? parseInt(limite) : 10,
    );
  }
}
