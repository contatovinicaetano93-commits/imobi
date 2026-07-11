import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { AtualizarUsuarioAdminInput, CriarUsuarioAdminInput, Role } from "@imbobi/schemas";

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Único jeito de criar contas ADMIN/FUNDO/ENGENHEIRO — cadastro público só faz CLIENTE. */
  async criar(input: CriarUsuarioAdminInput) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: input.email } });
    if (existe) throw new ConflictException("E-mail já cadastrado.");

    const senhaHash = await bcrypt.hash(input.senha, 12);
    return this.prisma.usuario.create({
      data: { nome: input.nome, email: input.email, senhaHash, role: input.role },
      select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
    });
  }

  listar(role?: Role) {
    return this.prisma.usuario.findMany({
      where: role ? { role } : undefined,
      select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
      orderBy: { criadoEm: "desc" },
    });
  }

  async obter(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
    });
    if (!usuario) throw new NotFoundException("Usuário não encontrado.");
    return usuario;
  }

  async atualizar(id: string, input: AtualizarUsuarioAdminInput) {
    await this.obter(id);
    const data: Record<string, unknown> = {};
    if (input.nome) data["nome"] = input.nome;
    if (input.email) data["email"] = input.email;
    if (input.role) data["role"] = input.role;
    if (input.novaSenha) data["senhaHash"] = await bcrypt.hash(input.novaSenha, 12);

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });
  }

  async alternarAtivo(id: string, ativo: boolean) {
    await this.obter(id);
    return this.prisma.usuario.update({
      where: { id },
      data: { ativo },
      select: { id: true, nome: true, ativo: true },
    });
  }
}
