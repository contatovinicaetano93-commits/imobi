import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Query, ForbiddenException, Logger } from "@nestjs/common";
import { UsuarioTipo } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { hash } from "bcryptjs";

function getStaffUsers() {
  const defaultPass = (key: string, fallback: string) => process.env[key] ?? fallback;
  return [
    { nome: "Vinicius Caetano",   email: "contato.vinicaetano93@gmail.com", cpf: "00000000000", telefone: "11999999999", senha: defaultPass("SETUP_ADMIN_SENHA",      "ChangeMe@123"), tipo: "ADMIN"      },
    { nome: "Administrador IMOBI",email: "admin@imobi.com.br",              cpf: "00000000001", telefone: "11900000001", senha: defaultPass("SETUP_ADMIN2_SENHA",     "Admin@123"),   tipo: "ADMIN"      },
    { nome: "Gestor do Fundo",    email: "gestor@imobi.com.br",             cpf: "00000000002", telefone: "11900000002", senha: defaultPass("SETUP_GESTOR_SENHA",     "Gestor@123"),  tipo: "GESTOR"     },
    { nome: "Engenheiro IMOBI",   email: "eng@imobi.com.br",                cpf: "00000000003", telefone: "11900000003", senha: defaultPass("SETUP_ENG_SENHA",        "Eng@123"),     tipo: "ENGENHEIRO" },
    { nome: "Parceiro Comercial", email: "comercial@imobi.com.br",          cpf: "00000000004", telefone: "11900000004", senha: defaultPass("SETUP_COMERCIAL_SENHA",  "Comercial@123"),tipo: "COMERCIAL" },
    { nome: "Construtor IMOBI",   email: "construtor@imobi.com.br",         cpf: "00000000005", telefone: "11900000005", senha: defaultPass("SETUP_CONSTRUTOR_SENHA", "Construtor@123"), tipo: "CONSTRUTOR" },
    { nome: "Tomador Teste",      email: "tomador@imobi.com.br",            cpf: "00000000006", telefone: "11900000006", senha: defaultPass("SETUP_TOMADOR_SENHA",    "Tomador@123"), tipo: "TOMADOR"    },
  ];
}

@ApiTags("Setup")
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

    const STAFF_USERS = getStaffUsers();
    for (const u of STAFF_USERS) {
      const passwordHash = await hash(u.senha, 12);
      await this.prisma.usuario.upsert({
        where: { email: u.email },
        update: { passwordHash, tipo: u.tipo as UsuarioTipo, kycStatus: "APROVADO", nome: u.nome },
        create: {
          nome: u.nome, email: u.email, cpf: u.cpf, telefone: u.telefone,
          passwordHash, tipo: u.tipo as UsuarioTipo, kycStatus: "APROVADO",
          consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true,
        },
      });
      this.logger.log(`Setup: ${u.tipo} ${u.email} OK`);
    }

    return {
      ok: true,
      mensagem: "Usuários criados/atualizados com sucesso.",
      usuarios: getStaffUsers().map((u) => ({
        perfil: u.tipo,
        email:  u.email,
        acesso: this.rotaParaTipo(u.tipo),
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
