import { Module } from "@nestjs/common";
import { EncryptionService } from "./encryption.service";
import { CpfEncryptionService } from "./cpf-encryption.service";
import { PhoneEncryptionService } from "./phone-encryption.service";

@Module({
  providers: [EncryptionService, CpfEncryptionService, PhoneEncryptionService],
  exports: [EncryptionService, CpfEncryptionService, PhoneEncryptionService],
})
export class EncryptionModule {}
