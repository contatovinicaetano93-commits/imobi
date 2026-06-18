import { BadRequestException, Controller, ForbiddenException, Get, Logger, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hash } from "bcryptjs";
import { UsuarioTipo } from "@prisma/client";

interface SetupUser {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  senha: string;
  tipo: UsuarioTipo;
}

const USUARIO_TIPOS = Object.values(UsuarioTipo) as string[];

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

    const staffUsers = this.carregarUsuariosSetup();

    for (const u of staffUsers) {
      const passwordHash = await hash(u.senha, 12);
      await this.prisma.usuario.upsert({
        where: { email: u.email },
        update: { passwordHash, tipo: u.tipo, kycStatus: "APROVADO", nome: u.nome },
        create: {
          nome: u.nome, email: u.email, cpf: u.cpf, telefone: u.telefone,
          passwordHash, tipo: u.tipo, kycStatus: "APROVADO",
          consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true,
        },
      });
      this.logger.log(`Setup: ${u.tipo} ${u.email} OK`);
    }

    return {
      ok: true,
      mensagem: "Usuários criados/atualizados com sucesso.",
      usuarios: staffUsers.map((u) => ({
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
      PARCEIRO:   "/dashboard/comercial",
      TOMADOR:    "/dashboard",
    };
    return mapa[tipo] ?? "/dashboard";
  }

  private carregarUsuariosSetup(): SetupUser[] {
    const rawUsers = process.env["SETUP_STAFF_USERS_JSON"];

    if (!rawUsers) {
      throw new BadRequestException("SETUP_STAFF_USERS_JSON não configurado.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawUsers);
    } catch {
      throw new BadRequestException("SETUP_STAFF_USERS_JSON deve ser um JSON válido.");
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new BadRequestException("SETUP_STAFF_USERS_JSON deve conter ao menos um usuário.");
    }

    return parsed.map((user, index) => this.validarUsuarioSetup(user, index));
  }

  private validarUsuarioSetup(user: unknown, index: number): SetupUser {
    if (!user || typeof user !== "object") {
      throw new BadRequestException(`Usuário de setup inválido na posição ${index}.`);
    }

    const candidate = user as Partial<Record<keyof SetupUser, unknown>>;
    const requiredFields: Array<keyof SetupUser> = ["nome", "email", "cpf", "telefone", "senha", "tipo"];

    for (const field of requiredFields) {
      if (typeof candidate[field] !== "string" || candidate[field]?.trim() === "") {
        throw new BadRequestException(`Campo ${field} inválido no usuário de setup ${index}.`);
      }
    }

    if (!USUARIO_TIPOS.includes(candidate.tipo as string)) {
      throw new BadRequestException(`Tipo inválido no usuário de setup ${index}.`);
    }

    return {
      nome: candidate.nome as string,
      email: candidate.email as string,
      cpf: candidate.cpf as string,
      telefone: candidate.telefone as string,
      senha: candidate.senha as string,
      tipo: candidate.tipo as UsuarioTipo,
    };
  }
}
