import { Controller, Get, Query, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hash } from "bcryptjs";

const STAFF_USERS = [
  { nome: "Administrador IMOBI", email: "admin@imobi.com.br",       cpf: "00000000001", telefone: "11900000001", senha: "Admin@123",      tipo: "ADMIN"      },
  { nome: "Gestor de Fundo",      email: "gestor@imobi.com.br",      cpf: "00000000002", telefone: "11900000002", senha: "Gestor@123",     tipo: "GESTOR"     },
  { nome: "Engenheiro IMOBI",     email: "eng@imobi.com.br",         cpf: "00000000003", telefone: "11900000003", senha: "Eng@123",        tipo: "ENGENHEIRO" },
  { nome: "Parceiro Comercial",   email: "comercial@imobi.com.br",   cpf: "00000000004", telefone: "11900000004", senha: "Comercial@123",  tipo: "COMERCIAL"  },
  { nome: "Construtor IMOBI",     email: "construtor@imobi.com.br",  cpf: "00000000005", telefone: "11900000005", senha: "Construtor@123", tipo: "CONSTRUTOR" },
];

@Controller("setup")
export class SetupController {
  private readonly logger = new Logger(SetupController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async criarUsuariosTeste(@Query("secret") secret: string) {
    const expected = process.env["SETUP_SECRET"];
    if (!expected || secret !== expected) {
      throw new ForbiddenException("Secret inválido ou não configurado.");
    }

    const resultados: { email: string; acao: "criado" | "atualizado"; senha: string }[] = [];

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

      const existia = await this.prisma.usuario.count({ where: { email: u.email } });
      resultados.push({ email: u.email, acao: existia > 0 ? "criado" : "atualizado", senha: u.senha });
      this.logger.log(`Setup: usuario ${u.tipo} ${u.email} pronto.`);
    }

    return {
      ok: true,
      mensagem: "Usuários de acesso criados/atualizados com sucesso.",
      usuarios: STAFF_USERS.map((u) => ({
        perfil:  u.tipo,
        email:   u.email,
        senha:   u.senha,
        acesso:  this.rotaParaTipo(u.tipo),
      })),
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
