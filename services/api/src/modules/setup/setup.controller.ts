import { Controller, Get, Query, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hash } from "bcryptjs";
import { getSetupUsers, rotaParaRoleSetup } from "../../seeds/setup-users";
import type { Role } from "@prisma/client";

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
      const senhaHash = await hash(u.senha, 12);
      await this.prisma.usuario.upsert({
        where: { email: u.email },
        update: { senhaHash, role: u.role as Role, nome: u.nome },
        create: { nome: u.nome, email: u.email, senhaHash, role: u.role as Role },
      });
      this.logger.log(`Setup: ${u.role} ${u.email} OK`);
    }

    return {
      ok: true,
      mensagem: "Usuários criados/atualizados com sucesso.",
      usuarios: users.map((u) => ({
        perfil: u.role,
        email: u.email,
        acesso: rotaParaRoleSetup(u.role),
      })),
      aviso: "Senha definida via SETUP_*_PASSWORD — troque após o primeiro acesso.",
    };
  }
}
