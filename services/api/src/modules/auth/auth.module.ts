import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { EncryptionModule } from "../encryption/encryption.module";
import { CsrfModule } from "../csrf/csrf.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { JwtRefreshStrategy } from "./jwt-refresh.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env["JWT_SECRET"],
      signOptions: { expiresIn: "15m" },
    }),
    EncryptionModule,
    CsrfModule,
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
