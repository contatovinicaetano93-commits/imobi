import { Module } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";
import { UsuariosController } from "./usuarios.controller";
import { CacheAppModule } from "../cache/cache.module";
import { EncryptionModule } from "../encryption/encryption.module";

@Module({
  imports: [CacheAppModule, EncryptionModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
