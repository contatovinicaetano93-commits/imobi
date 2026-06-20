import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { UsuariosService } from "./usuarios.service";
import { UsuariosController } from "./usuarios.controller";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [
    BullModule.registerQueue({ name: "excluir-usuario" }),
    StorageModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
