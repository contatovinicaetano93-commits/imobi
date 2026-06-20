import { Module } from "@nestjs/common";
import { ConstrutorController } from "./construtor.controller";
import { ConstrutorService } from "./construtor.service";

@Module({
  controllers: [ConstrutorController],
  providers: [ConstrutorService],
})
export class ConstrutorModule {}
