import { Controller, Get, Query, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hash } from "bcryptjs";
import { getSetupUsers, rotaParaTipoSetup } from "../../seeds/setup-users";
import type { UsuarioTipo } from "@prisma/client";

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

    const users = getSetupUsers();

    for (const u of users) {
      const passwordHash = await hash(u.senha, 12);
      await this.prisma.usuario.upsert({
        where: { email: u.email },
        update: { passwordHash, tipo: u.tipo as UsuarioTipo, kycStatus: "APROVADO", nome: u.nome },
        create: {
          nome: u.nome,
          email: u.email,
          cpf: u.cpf,
          telefone: u.telefone,
          passwordHash,
          tipo: u.tipo as UsuarioTipo,
          kycStatus: "APROVADO",
          consentidoTermos: true,
          consentidoPrivacy: true,
          consentidoKyc: true,
        },
      });
      this.logger.log(`Setup: ${u.tipo} ${u.email} OK`);
    }

    return {
      ok: true,
      mensagem: "Usuários criados/atualizados com sucesso.",
      usuarios: users.map((u) => ({
        perfil: u.tipo,
        email: u.email,
        acesso: rotaParaTipoSetup(u.tipo),
      })),
    };
  }
}
