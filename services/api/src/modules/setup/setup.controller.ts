import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Query, ForbiddenException, Logger, ServiceUnavailableException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UsuarioTipo } from "@prisma/client";
import { timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { hash } from "bcryptjs";

function getStaffUsers() {
  const required = (key: string) => {
    const val = process.env[key];
    if (!val) throw new ServiceUnavailableException(`${key} env var não configurada — não é possível executar o setup`);
    return val;
  };
  return [
    { nome: "Vinicius Caetano",    email: "contato.vinicaetano93@gmail.com", cpf: "00000000000", telefone: "11999999999", senha: required("SETUP_ADMIN_SENHA"),      tipo: "ADMIN"      },
    { nome: "Administrador IMOBI", email: "admin@imobi.com.br",              cpf: "00000000001", telefone: "11900000001", senha: required("SETUP_ADMIN2_SENHA"),     tipo: "ADMIN"      },
    { nome: "Gestor do Fundo",     email: "gestor@imobi.com.br",             cpf: "00000000002", telefone: "11900000002", senha: required("SETUP_GESTOR_SENHA"),     tipo: "GESTOR"     },
    { nome: "Engenheiro IMOBI",    email: "eng@imobi.com.br",                cpf: "00000000003", telefone: "11900000003", senha: required("SETUP_ENG_SENHA"),        tipo: "ENGENHEIRO" },
    { nome: "Parceiro Comercial",  email: "comercial@imobi.com.br",          cpf: "00000000004", telefone: "11900000004", senha: required("SETUP_COMERCIAL_SENHA"),  tipo: "COMERCIAL"  },
    { nome: "Construtor IMOBI",    email: "construtor@imobi.com.br",         cpf: "00000000005", telefone: "11900000005", senha: required("SETUP_CONSTRUTOR_SENHA"), tipo: "CONSTRUTOR" },
    { nome: "Tomador Teste",       email: "tomador@imobi.com.br",            cpf: "00000000006", telefone: "11900000006", senha: required("SETUP_TOMADOR_SENHA"),    tipo: "TOMADOR"    },
  ];
}

@ApiTags("Setup")
@Controller("setup")
export class SetupController {
  private readonly logger = new Logger(SetupController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  async criarUsuariosTeste(@Query("secret") secret: string) {
    const expected = process.env["SETUP_SECRET"];
    if (!expected) {
      throw new ForbiddenException("Setup endpoint não configurado.");
    }

    // Timing-safe comparison to prevent secret enumeration via response latency
    let authorized = false;
    try {
      const a = Buffer.from(secret ?? "");
      const b = Buffer.from(expected);
      authorized = a.length === b.length && timingSafeEqual(a, b);
    } catch { authorized = false; }

    if (!authorized) {
      throw new ForbiddenException("Secret inválido.");
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
      usuarios: STAFF_USERS.map((u) => ({
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
