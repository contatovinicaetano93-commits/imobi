import { Controller, Get, Post, Body, Query, ForbiddenException, ConflictException, BadRequestException, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { hash } from "bcryptjs";

const STAFF_USERS = [
  { nome: "Vinicius Caetano",      email: "contato.vinicaetano93@gmail.com", cpf: "00000000000", telefone: "11999999999", senha: "Paularenata1@",  tipo: "ADMIN"      },
  { nome: "Administrador IMOBI",   email: "admin@imobi.com.br",              cpf: "00000000001", telefone: "11900000001", senha: "Admin@123",      tipo: "ADMIN"      },
  { nome: "Gestor do Fundo",       email: "gestor@imobi.com.br",             cpf: "00000000002", telefone: "11900000002", senha: "Gestor@123",     tipo: "GESTOR"     },
  { nome: "Engenheiro IMOBI",      email: "eng@imobi.com.br",                cpf: "00000000003", telefone: "11900000003", senha: "Eng@123",        tipo: "ENGENHEIRO" },
  { nome: "Parceiro Comercial",    email: "comercial@imobi.com.br",          cpf: "00000000004", telefone: "11900000004", senha: "Comercial@123",  tipo: "COMERCIAL"  },
  { nome: "Construtor IMOBI",      email: "construtor@imobi.com.br",         cpf: "00000000005", telefone: "11900000005", senha: "Construtor@123", tipo: "CONSTRUTOR" },
  { nome: "Tomador Teste",         email: "tomador@imobi.com.br",            cpf: "00000000006", telefone: "11900000006", senha: "Tomador@123",    tipo: "TOMADOR"    },
];

@ApiTags("setup")
@SkipThrottle()
@Controller("setup")
export class SetupController {
  private readonly logger = new Logger(SetupController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed de usuários de teste — desabilitado em produção.
   * Em dev: GET /api/v1/setup?secret=SETUP_SECRET
   */
  @ApiOperation({ summary: "Seed de usuários de teste (desabilitado em produção)" })
  @ApiQuery({ name: "secret", description: "SETUP_SECRET do .env", required: true })
  @Get()
  async criarUsuariosTeste(@Query("secret") secret: string) {
    if (process.env["NODE_ENV"] === "production") {
      throw new ForbiddenException("Endpoint desabilitado em produção.");
    }
    const expected = process.env["SETUP_SECRET"];
    if (!expected || secret !== expected) {
      throw new ForbiddenException("Secret inválido ou não configurado.");
    }

    for (const u of STAFF_USERS) {
      const passwordHash = await hash(u.senha, 12);
      await this.prisma.usuario.upsert({
        where: { email: u.email },
        update: { passwordHash, tipo: u.tipo as any, kycStatus: "APROVADO", nome: u.nome },
        create: {
          nome: u.nome, email: u.email, cpf: u.cpf, telefone: u.telefone,
          passwordHash, tipo: u.tipo as any, kycStatus: "APROVADO",
          consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true,
        },
      });
      this.logger.log(`Setup: ${u.tipo} ${u.email} OK`);
    }

    return {
      ok: true,
      mensagem: "Usuários criados/atualizados com sucesso.",
      usuarios: STAFF_USERS.map((u) => ({
        perfil: u.tipo,
        email:  u.email,
        acesso: this.rotaParaTipo(u.tipo),
      })),
    };
  }

  /**
   * Init de produção — cria o primeiro ADMIN quando não existe nenhum.
   * Requer SETUP_SECRET no .env. Após criar o admin, remova SETUP_SECRET.
   *
   * POST /api/v1/setup/init?secret=SETUP_SECRET
   * Body: { nome, email, senha }
   */
  @ApiOperation({ summary: "Cria o primeiro usuário ADMIN em banco vazio (produção)" })
  @ApiQuery({ name: "secret", description: "SETUP_SECRET configurado no servidor", required: true })
  @ApiBody({ schema: { example: { nome: "Admin IMOBI", email: "admin@imobi.com.br", senha: "Senha@Forte123" } } })
  @Post("init")
  async initProducao(
    @Query("secret") secret: string,
    @Body() body: { nome?: string; email?: string; senha?: string },
  ) {
    const expected = process.env["SETUP_SECRET"];
    if (!expected || secret !== expected) {
      throw new ForbiddenException("SETUP_SECRET inválido ou não configurado.");
    }

    const { nome, email, senha } = body;
    if (!nome || !email || !senha) {
      throw new BadRequestException("nome, email e senha são obrigatórios.");
    }
    if (senha.length < 8) {
      throw new BadRequestException("senha deve ter ao menos 8 caracteres.");
    }

    // Só permite quando não existe nenhum ADMIN — proteção contra uso acidental
    const adminCount = await this.prisma.usuario.count({ where: { tipo: "ADMIN" } });
    if (adminCount > 0) {
      throw new ConflictException(
        `Já existe(m) ${adminCount} usuário(s) ADMIN. Use o painel admin para criar novos usuários.`,
      );
    }

    const emailExists = await this.prisma.usuario.findUnique({ where: { email } });
    if (emailExists) {
      throw new ConflictException(`Email ${email} já está em uso.`);
    }

    const passwordHash = await hash(senha, 12);
    const admin = await this.prisma.usuario.create({
      data: {
        nome,
        email,
        cpf: "00000000000",
        telefone: "00000000000",
        passwordHash,
        tipo: "ADMIN",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
        consentidoEm: new Date(),
      },
      select: { usuarioId: true, nome: true, email: true, tipo: true, criadoEm: true },
    });

    this.logger.log(`[SETUP] Primeiro ADMIN criado: ${email} (${admin.usuarioId})`);

    return {
      ok: true,
      mensagem: "Admin criado com sucesso. Remova SETUP_SECRET das variáveis de ambiente.",
      admin,
      proximosPasso: [
        "Acesse /dashboard/admin com o email e senha informados",
        "Crie os demais usuários (gestor, engenheiro, etc.) pelo painel admin",
        "Remova a variável SETUP_SECRET do Render (Settings → Environment)",
      ],
    };
  }

  private rotaParaTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      ADMIN:      "/dashboard/admin",
      GESTOR:     "/dashboard/gestor",
      ENGENHEIRO: "/dashboard/engenheiro",
      COMERCIAL:  "/dashboard/comercial",
      CONSTRUTOR: "/dashboard/construtor",
      TOMADOR:    "/dashboard",
    };
    return mapa[tipo] ?? "/dashboard";
  }
}

