import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("storage")
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post("upload-url")
  urlDeUpload(@Body("prefixo") prefixo: string, @Body("contentType") contentType: string) {
    return this.storage.urlDeUpload(prefixo, contentType);
  }
}
