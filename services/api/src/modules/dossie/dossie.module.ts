import { Module } from "@nestjs/common";
import { DossieController } from "./dossie.controller";
import { DossieService } from "./dossie.service";

@Module({ controllers: [DossieController], providers: [DossieService] })
export class DossieModule {}
